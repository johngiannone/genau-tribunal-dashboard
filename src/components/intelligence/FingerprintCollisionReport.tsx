import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Monitor, Cpu, HardDrive, Ban, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CollisionRecord {
  fingerprintHash: string;
  userIds: string[];
  userCount: number;
  screenResolution: string;
  cpuCores: number;
  deviceMemory: number | null;
  canvasHash: string;
  lastSeen: string;
  totalCollections: number;
}

interface FingerprintCollisionReportProps {
  onRefresh?: () => void;
}

export function FingerprintCollisionReport({ onRefresh }: FingerprintCollisionReportProps) {
  const [collisions, setCollisions] = useState<CollisionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollisions();
  }, []);

  const fetchCollisions = async () => {
    try {
      setLoading(true);

      const { data: fingerprints, error } = await supabase
        .from('user_fingerprints')
        .select('*')
        .not('user_id', 'is', null)
        .order('collected_at', { ascending: false });

      if (error) throw error;

      // Group by fingerprint hash
      const hashGroups = new Map<string, any[]>();
      fingerprints?.forEach(fp => {
        const existing = hashGroups.get(fp.fingerprint_hash) || [];
        existing.push(fp);
        hashGroups.set(fp.fingerprint_hash, existing);
      });

      // Filter for collisions (multiple users with same fingerprint)
      const collisionData: CollisionRecord[] = [];
      hashGroups.forEach((records, hash) => {
        const uniqueUsers = new Set(records.map(r => r.user_id));
        
        if (uniqueUsers.size > 1) {
          const latest = records[0];
          collisionData.push({
            fingerprintHash: hash,
            userIds: Array.from(uniqueUsers) as string[],
            userCount: uniqueUsers.size,
            screenResolution: latest.screen_resolution || 'Unknown',
            cpuCores: latest.cpu_cores || 0,
            deviceMemory: latest.device_memory,
            canvasHash: latest.canvas_hash || 'Unknown',
            lastSeen: latest.collected_at,
            totalCollections: records.length,
          });
        }
      });

      // Sort by user count (highest first)
      collisionData.sort((a, b) => b.userCount - a.userCount);
      setCollisions(collisionData);

    } catch (error) {
      console.error('Error fetching collisions:', error);
      toast.error('Failed to load collision data');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_usage')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: 'Device fingerprint collision detected - potential ban evasion',
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('User banned successfully');
      fetchCollisions();
      onRefresh?.();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const getSeverityColor = (userCount: number) => {
    if (userCount >= 5) return 'destructive';
    if (userCount >= 3) return 'secondary';
    return 'default';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading collision data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (collisions.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">✓ No Collisions Detected</CardTitle>
          <CardDescription className="text-green-700">
            All device fingerprints are unique. No ban evasion attempts detected.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Fingerprint Collision Report
            </CardTitle>
            <CardDescription className="text-red-700">
              {collisions.length} device fingerprint{collisions.length !== 1 ? 's' : ''} shared by multiple users
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCollisions();
              onRefresh?.();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {collisions.map((collision) => (
            <Card key={collision.fingerprintHash} className="border-2 border-red-100 bg-red-50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(collision.userCount)}>
                        {collision.userCount} Users Sharing Device
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        Hash: {collision.fingerprintHash.substring(0, 12)}...
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Monitor className="h-4 w-4" />
                        {collision.screenResolution}
                      </div>
                      <div className="flex items-center gap-1">
                        <Cpu className="h-4 w-4" />
                        {collision.cpuCores} cores
                      </div>
                      {collision.deviceMemory && (
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-4 w-4" />
                          {collision.deviceMemory}GB RAM
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Last seen: {new Date(collision.lastSeen).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-900">Affected User IDs:</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collision.userIds.map((userId) => (
                        <TableRow key={userId}>
                          <TableCell className="font-mono text-xs">
                            {userId.substring(0, 16)}...
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleBanUser(userId)}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              Ban User
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
