import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type BlockedIP = Tables<"blocked_ips">;

export const BlockedIPsPanel = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
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
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
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
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {ip.blocked_reason}
                        </p>
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
  );
};