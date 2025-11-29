import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TimezoneMismatch {
  ipAddress: string;
  countryCode: string;
  detectedTimezone: string | null;
  browserTimezoneOffset: number | null;
  fraudScore: number;
  isVpn: boolean;
  isProxy: boolean;
  blockedAt: string;
  associatedUserId: string | null;
}

export function TimezoneMismatchDetection() {
  const [mismatches, setMismatches] = useState<TimezoneMismatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimezoneMismatches();
  }, []);

  const fetchTimezoneMismatches = async () => {
    try {
      setLoading(true);

      // Fetch blocked IPs with detection data
      const { data: blockedIps, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .not('detection_data', 'is', null)
        .order('blocked_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Cross-reference with fingerprint data to get browser timezone
      const { data: fingerprints } = await supabase
        .from('user_fingerprints')
        .select('user_id, timezone_offset');

      const fingerprintMap = new Map<string, number>();
      fingerprints?.forEach(fp => {
        if (fp.user_id && fp.timezone_offset !== null) {
          fingerprintMap.set(fp.user_id, fp.timezone_offset);
        }
      });

      // Analyze for timezone mismatches
      const mismatchData: TimezoneMismatch[] = [];
      
      blockedIps?.forEach(ip => {
        const detectionData = ip.detection_data as any;
        const browserTimezoneOffset = ip.associated_user_id 
          ? fingerprintMap.get(ip.associated_user_id) ?? null
          : null;

        // High fraud score or VPN/Proxy flagged = likely timezone mismatch
        if (ip.fraud_score && ip.fraud_score > 70) {
          mismatchData.push({
            ipAddress: ip.ip_address,
            countryCode: ip.country_code || 'Unknown',
            detectedTimezone: detectionData?.timezone || null,
            browserTimezoneOffset,
            fraudScore: ip.fraud_score,
            isVpn: ip.is_vpn || false,
            isProxy: ip.is_proxy || false,
            blockedAt: ip.blocked_at,
            associatedUserId: ip.associated_user_id,
          });
        }
      });

      // Sort by fraud score (highest first)
      mismatchData.sort((a, b) => b.fraudScore - a.fraudScore);
      setMismatches(mismatchData);

    } catch (error) {
      console.error('Error fetching timezone mismatches:', error);
      toast.error('Failed to load timezone mismatch data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (fraudScore: number) => {
    if (fraudScore >= 85) return { label: 'Critical', variant: 'destructive' as const };
    if (fraudScore >= 75) return { label: 'High', variant: 'secondary' as const };
    return { label: 'Medium', variant: 'default' as const };
  };

  const getTimezoneDescription = (offset: number | null) => {
    if (offset === null) return 'Unknown';
    const hours = Math.abs(offset / 60);
    const sign = offset > 0 ? '-' : '+';
    return `UTC${sign}${hours}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading timezone analysis...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (mismatches.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">✓ No Timezone Mismatches</CardTitle>
          <CardDescription className="text-green-700">
            All detected locations match expected timezone patterns.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timezone Mismatch Detection
        </CardTitle>
        <CardDescription>
          IPs with suspicious timezone patterns indicating VPN/Proxy usage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP Address</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Detected Timezone</TableHead>
              <TableHead>Browser Timezone</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mismatches.map((mismatch, idx) => {
              const risk = getRiskLevel(mismatch.fraudScore);
              return (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">
                    {mismatch.ipAddress}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">{mismatch.countryCode}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {mismatch.detectedTimezone || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getTimezoneDescription(mismatch.browserTimezoneOffset)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={risk.variant}>
                      {risk.label} ({mismatch.fraudScore}%)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {mismatch.isVpn && (
                        <Badge variant="outline" className="text-xs">VPN</Badge>
                      )}
                      {mismatch.isProxy && (
                        <Badge variant="outline" className="text-xs">Proxy</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(mismatch.blockedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
