import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Fingerprint, AlertTriangle, Monitor, Cpu, HardDrive } from "lucide-react";
import { toast } from "sonner";

interface FingerprintRecord {
  id: string;
  user_id: string | null;
  fingerprint_hash: string;
  screen_resolution: string;
  cpu_cores: number;
  device_memory: number | null;
  canvas_hash: string;
  webgl_renderer: string | null;
  collected_at: string;
  metadata: any;
}

interface FingerprintCollision {
  fingerprintHash: string;
  userCount: number;
  userIds: string[];
  screenResolution: string;
  cpuCores: number;
  lastSeen: string;
}

export function FingerprintAnalyticsPanel() {
  const [fingerprints, setFingerprints] = useState<FingerprintRecord[]>([]);
  const [collisions, setCollisions] = useState<FingerprintCollision[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFingerprints, setTotalFingerprints] = useState(0);
  const [uniqueDevices, setUniqueDevices] = useState(0);

  useEffect(() => {
    fetchFingerprintData();
  }, []);

  const fetchFingerprintData = async () => {
    try {
      setLoading(true);

      // Fetch all fingerprints
      const { data: fingerprintsData, error: fingerprintsError } = await supabase
        .from('user_fingerprints')
        .select('*')
        .order('collected_at', { ascending: false })
        .limit(100);

      if (fingerprintsError) throw fingerprintsError;

      setFingerprints(fingerprintsData || []);
      setTotalFingerprints(fingerprintsData?.length || 0);

      // Calculate unique devices
      const uniqueHashes = new Set(fingerprintsData?.map(fp => fp.fingerprint_hash));
      setUniqueDevices(uniqueHashes.size);

      // Detect collisions (same fingerprint hash, different user IDs)
      const hashGroups = new Map<string, FingerprintRecord[]>();
      
      fingerprintsData?.forEach(fp => {
        if (!fp.user_id) return;
        
        const existing = hashGroups.get(fp.fingerprint_hash) || [];
        existing.push(fp);
        hashGroups.set(fp.fingerprint_hash, existing);
      });

      const detectedCollisions: FingerprintCollision[] = [];
      hashGroups.forEach((records, hash) => {
        const uniqueUsers = new Set(records.map(r => r.user_id).filter(Boolean));
        
        if (uniqueUsers.size > 1) {
          const latest = records[0];
          detectedCollisions.push({
            fingerprintHash: hash,
            userCount: uniqueUsers.size,
            userIds: Array.from(uniqueUsers) as string[],
            screenResolution: latest.screen_resolution,
            cpuCores: latest.cpu_cores,
            lastSeen: latest.collected_at,
          });
        }
      });

      setCollisions(detectedCollisions);

      if (detectedCollisions.length > 0) {
        toast.warning(`⚠️ Detected ${detectedCollisions.length} fingerprint collision(s) - potential ban evasion`);
      }

    } catch (error) {
      console.error('Error fetching fingerprint data:', error);
      toast.error('Failed to load fingerprint analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Fingerprint Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading fingerprint data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fingerprints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFingerprints}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueDevices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Collisions Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{collisions.length}</div>
            {collisions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Potential ban evasion</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collision Alerts */}
      {collisions.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Fingerprint Collisions Detected
            </CardTitle>
            <CardDescription className="text-red-700">
              Multiple user accounts sharing the same device fingerprint - potential ban evasion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fingerprint Hash</TableHead>
                  <TableHead>User Count</TableHead>
                  <TableHead>Device Info</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collisions.map((collision) => (
                  <TableRow key={collision.fingerprintHash}>
                    <TableCell className="font-mono text-xs">
                      {collision.fingerprintHash.substring(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{collision.userCount} users</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <Monitor className="h-3 w-3" />
                        {collision.screenResolution}
                        <Cpu className="h-3 w-3 ml-2" />
                        {collision.cpuCores} cores
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(collision.lastSeen).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Fingerprints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Recent Fingerprints
          </CardTitle>
          <CardDescription>Latest 100 device fingerprints collected</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Fingerprint</TableHead>
                <TableHead>Device Specs</TableHead>
                <TableHead>Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fingerprints.map((fp) => (
                <TableRow key={fp.id}>
                  <TableCell className="font-mono text-xs">
                    {fp.user_id ? fp.user_id.substring(0, 8) + '...' : 'Anonymous'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {fp.fingerprint_hash.substring(0, 12)}...
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {fp.screen_resolution}
                      </div>
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" />
                        {fp.cpu_cores} cores
                      </div>
                      {fp.device_memory && (
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {fp.device_memory}GB RAM
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(fp.collected_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
