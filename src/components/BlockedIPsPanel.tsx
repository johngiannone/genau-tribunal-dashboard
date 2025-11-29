import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, ShieldCheck, Trash2, TrashIcon, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BlockedIP = Tables<"blocked_ips">;

export const BlockedIPsPanel = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    action: "expired" | "country" | null;
    country?: string;
  }>({ open: false, action: null });
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBlockedIPs();
    
    // Listen for new blocked IPs
    const channel = supabase
      .channel('blocked-ips-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_ips'
        },
        () => {
          fetchBlockedIPs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBlockedIPs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blocked_ips")
      .select("*")
      .order("blocked_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch blocked IPs:", error);
      toast.error("Failed to load blocked IPs");
    } else {
      setBlockedIPs(data || []);
    }
    setLoading(false);
  };

  const unblockIP = async (ipAddress: string) => {
    const { error } = await supabase
      .from("blocked_ips")
      .delete()
      .eq("ip_address", ipAddress);

    if (error) {
      toast.error("Failed to unblock IP address");
      console.error(error);
      return;
    }

    toast.success("IP address has been unblocked");
    fetchBlockedIPs();
  };

  const isExpired = (blockExpiresAt: string | null, isPermanent: boolean) => {
    if (isPermanent) return false;
    if (!blockExpiresAt) return true;
    return new Date(blockExpiresAt) < new Date();
  };

  const getTimeRemaining = (blockExpiresAt: string | null) => {
    if (!blockExpiresAt) return null;
    const minutes = Math.ceil((new Date(blockExpiresAt).getTime() - Date.now()) / 60000);
    if (minutes <= 0) return "Expired";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const activeBlocks = blockedIPs.filter(ip => !isExpired(ip.block_expires_at, ip.is_permanent));
  const expiredBlocks = blockedIPs.filter(ip => isExpired(ip.block_expires_at, ip.is_permanent));

  // Get unique countries from active blocks
  const uniqueCountries = Array.from(
    new Set(activeBlocks.map(ip => ip.country_code).filter(Boolean))
  ).sort() as string[];

  const handleBulkUnblock = async () => {
    if (!bulkActionDialog.action) return;

    setProcessing(true);
    try {
      if (bulkActionDialog.action === "expired") {
        // Delete all expired blocks
        const expiredIPs = expiredBlocks.map(ip => ip.ip_address);
        
        if (expiredIPs.length === 0) {
          toast.info("No expired blocks to remove");
          setBulkActionDialog({ open: false, action: null });
          setProcessing(false);
          return;
        }

        const { error } = await supabase
          .from("blocked_ips")
          .delete()
          .in("ip_address", expiredIPs);

        if (error) throw error;

        toast.success(`Removed ${expiredIPs.length} expired block${expiredIPs.length !== 1 ? 's' : ''}`);
      } else if (bulkActionDialog.action === "country" && bulkActionDialog.country) {
        // Delete all blocks from specific country
        const countryIPs = blockedIPs
          .filter(ip => ip.country_code === bulkActionDialog.country)
          .map(ip => ip.ip_address);

        if (countryIPs.length === 0) {
          toast.info("No blocks found for this country");
          setBulkActionDialog({ open: false, action: null });
          setProcessing(false);
          return;
        }

        const { error } = await supabase
          .from("blocked_ips")
          .delete()
          .in("ip_address", countryIPs);

        if (error) throw error;

        toast.success(`Removed ${countryIPs.length} block${countryIPs.length !== 1 ? 's' : ''} from ${bulkActionDialog.country}`);
      }

      fetchBlockedIPs();
      setBulkActionDialog({ open: false, action: null });
      setSelectedCountry("");
    } catch (error) {
      console.error("Bulk unblock error:", error);
      toast.error("Failed to perform bulk unblock");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Blocked IP Addresses
          </CardTitle>
          <CardDescription>Loading blocked IPs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrashIcon className="h-5 w-5" />
            Bulk Actions
          </CardTitle>
          <CardDescription>
            Remove multiple blocked IPs at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setBulkActionDialog({ open: true, action: "expired" })}
              disabled={expiredBlocks.length === 0}
              className="gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Clear All Expired ({expiredBlocks.length})
            </Button>

            <div className="flex gap-2 flex-1">
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select country to unblock" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCountries.map(country => {
                    const count = blockedIPs.filter(ip => ip.country_code === country).length;
                    return (
                      <SelectItem key={country} value={country}>
                        {country} ({count} block{count !== 1 ? 's' : ''})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setBulkActionDialog({ 
                  open: true, 
                  action: "country", 
                  country: selectedCountry 
                })}
                disabled={!selectedCountry}
                className="gap-2"
              >
                <Globe className="h-4 w-4" />
                Unblock Country
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Active IP Blocks
          </CardTitle>
          <CardDescription>
            IP addresses currently blocked from creating accounts. {activeBlocks.length} active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
              <p>No active IP blocks</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Detection</TableHead>
                    <TableHead>Fraud Score</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBlocks.map((ip) => (
                    <TableRow key={ip.ip_address}>
                      <TableCell className="font-mono font-semibold">
                        {ip.ip_address}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ip.is_vpn && <Badge variant="destructive" className="text-xs">VPN</Badge>}
                          {ip.is_proxy && <Badge variant="destructive" className="text-xs">Proxy</Badge>}
                          {ip.is_tor && <Badge variant="destructive" className="text-xs">Tor</Badge>}
                          {!ip.is_vpn && !ip.is_proxy && !ip.is_tor && <Badge variant="secondary" className="text-xs">Other</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ip.fraud_score !== null ? (
                          <Badge 
                            variant={ip.fraud_score > 85 ? "destructive" : ip.fraud_score > 75 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {ip.fraud_score}/100
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ip.country_code || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(ip.blocked_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {ip.is_permanent ? (
                          <Badge variant="destructive">Permanent</Badge>
                        ) : (
                          <Badge variant="secondary">Temporary</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {ip.is_permanent ? (
                          <Badge variant="outline" className="bg-red-50">Never</Badge>
                        ) : (
                          <Badge variant="default">{getTimeRemaining(ip.block_expires_at)}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unblockIP(ip.ip_address)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expired Blocks */}
      {expiredBlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              Expired IP Blocks
            </CardTitle>
            <CardDescription>
              Previously blocked IPs that have expired. {expiredBlocks.length} expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Expired At</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiredBlocks.map((ip) => (
                    <TableRow key={ip.ip_address} className="opacity-60">
                      <TableCell className="font-mono">
                        {ip.ip_address}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(ip.blocked_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ip.block_expires_at
                          ? formatDistanceToNow(new Date(ip.block_expires_at), { addSuffix: true })
                          : "N/A"}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {ip.blocked_reason}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unblockIP(ip.ip_address)}
                          className="text-muted-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>

    {/* Bulk Action Confirmation Dialog */}
    <AlertDialog 
      open={bulkActionDialog.open} 
      onOpenChange={(open) => !open && setBulkActionDialog({ open: false, action: null })}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {bulkActionDialog.action === "expired" 
              ? "Remove All Expired Blocks?" 
              : `Unblock All IPs from ${bulkActionDialog.country}?`
            }
          </AlertDialogTitle>
          <AlertDialogDescription>
            {bulkActionDialog.action === "expired" ? (
              <>
                This will permanently remove <strong>{expiredBlocks.length}</strong> expired IP block
                {expiredBlocks.length !== 1 ? 's' : ''} from the database. This action cannot be undone.
              </>
            ) : (
              <>
                This will permanently remove <strong>
                  {blockedIPs.filter(ip => ip.country_code === bulkActionDialog.country).length}
                </strong> IP block{blockedIPs.filter(ip => ip.country_code === bulkActionDialog.country).length !== 1 ? 's' : ''} from{' '}
                <strong>{bulkActionDialog.country}</strong>. Users from this country will be able to create accounts again.
                This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleBulkUnblock();
            }}
            disabled={processing}
            className="bg-destructive hover:bg-destructive/90"
          >
            {processing ? "Removing..." : "Remove Blocks"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};