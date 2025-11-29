import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Ban, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";

interface CountryDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryCode: string;
  countryName: string;
}

interface CountryStats {
  totalBlocks: number;
  vpnCount: number;
  proxyCount: number;
  torCount: number;
  avgFraudScore: number;
  recentBlocks: Array<{
    ip_address: string;
    fraud_score: number | null;
    blocked_at: string;
  }>;
}

export const CountryDetailsDialog = ({
  open,
  onOpenChange,
  countryCode,
  countryName,
}: CountryDetailsDialogProps) => {
  const [stats, setStats] = useState<CountryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockDuration, setBlockDuration] = useState("24h");
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (open && countryCode) {
      fetchCountryStats();
    }
  }, [open, countryCode]);

  const fetchCountryStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("blocked_ips")
        .select("ip_address, is_vpn, is_proxy, is_tor, fraud_score, blocked_at")
        .eq("country_code", countryCode)
        .order("blocked_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const vpnCount = data.filter((ip) => ip.is_vpn).length;
        const proxyCount = data.filter((ip) => ip.is_proxy).length;
        const torCount = data.filter((ip) => ip.is_tor).length;

        const scoresWithValues = data.filter((ip) => ip.fraud_score !== null);
        const avgFraudScore =
          scoresWithValues.length > 0
            ? scoresWithValues.reduce((sum, ip) => sum + (ip.fraud_score || 0), 0) /
              scoresWithValues.length
            : 0;

        setStats({
          totalBlocks: data.length,
          vpnCount,
          proxyCount,
          torCount,
          avgFraudScore: Math.round(avgFraudScore),
          recentBlocks: data.slice(0, 5),
        });
      }
    } catch (error) {
      console.error("Error fetching country stats:", error);
      toast.error("Failed to load country statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockCountry = async () => {
    setBlocking(true);
    try {
      const durationMap: Record<string, number> = {
        "1h": 1,
        "6h": 6,
        "12h": 12,
        "24h": 24,
        "48h": 48,
        "7d": 168,
      };

      const hours = durationMap[blockDuration];

      const { error } = await supabase.functions.invoke("block-country", {
        body: {
          countryCode,
          durationHours: hours,
        },
      });

      if (error) throw error;

      toast.success(`All IPs from ${countryName} blocked for ${blockDuration}`, {
        description: "Country-level block has been activated",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error blocking country:", error);
      toast.error("Failed to block country");
    } finally {
      setBlocking(false);
    }
  };

  const getCountryFlag = (code: string) => {
    const codePoints = code
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="text-3xl">{getCountryFlag(countryCode)}</span>
            {countryName} ({countryCode})
          </DialogTitle>
          <DialogDescription>
            Detailed security statistics and blocking controls for this country
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading statistics...</div>
        ) : stats ? (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Blocks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBlocks}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Fraud Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgFraudScore}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    VPN Detections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.vpnCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Proxy/Tor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {stats.proxyCount + stats.torCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Blocks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent Blocked IPs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentBlocks.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentBlocks.map((block) => (
                      <div
                        key={block.ip_address}
                        className="flex items-center justify-between text-sm p-2 rounded-lg border"
                      >
                        <span className="font-mono">{block.ip_address}</span>
                        <div className="flex items-center gap-2">
                          {block.fraud_score && (
                            <Badge
                              variant={
                                block.fraud_score > 85
                                  ? "destructive"
                                  : block.fraud_score > 75
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-xs"
                            >
                              {block.fraud_score}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(block.blocked_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No recent blocks
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Country-Level Block Controls */}
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <Ban className="h-4 w-4" />
                  Country-Level Block
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Temporarily block all signups from {countryName}. This will prevent any new
                  accounts from being created from IPs in this country.
                </p>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Select value={blockDuration} onValueChange={setBlockDuration}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="6h">6 Hours</SelectItem>
                      <SelectItem value="12h">12 Hours</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="48h">48 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">No data available</div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={blocking}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBlockCountry}
            disabled={blocking || !stats || stats.totalBlocks === 0}
            className="gap-2"
          >
            {blocking ? (
              <>
                <span className="animate-spin">⏳</span>
                Blocking...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                Block Country for {blockDuration}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
