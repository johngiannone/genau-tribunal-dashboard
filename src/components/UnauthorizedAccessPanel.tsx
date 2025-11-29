import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, User, Shield } from "lucide-react";
import { format } from "date-fns";

interface UnauthorizedAccessMetadata {
  attempted_route: string;
  reason: string;
  user_tier: string;
  is_admin: boolean;
  timestamp: string;
}

interface UnauthorizedAccessLog {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  metadata: UnauthorizedAccessMetadata;
  ip_address?: string | null;
}

export const UnauthorizedAccessPanel = () => {
  const [logs, setLogs] = useState<UnauthorizedAccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnauthorizedAccessLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('unauthorized_access_logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
          filter: 'activity_type=eq.unauthorized_access'
        },
        () => {
          fetchUnauthorizedAccessLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnauthorizedAccessLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'unauthorized_access')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Type cast the metadata field (double cast through unknown for Json type)
      const typedLogs = (data || []).map(log => ({
        ...log,
        metadata: log.metadata as unknown as UnauthorizedAccessMetadata
      })) as UnauthorizedAccessLog[];
      
      setLogs(typedLogs);
    } catch (error) {
      console.error('Error fetching unauthorized access logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRouteBadgeColor = (route: string) => {
    if (route.includes('/admin')) return 'destructive';
    if (route.includes('/billing')) return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Unauthorized Access Attempts
          </CardTitle>
          <CardDescription>Loading security logs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Unauthorized Access Attempts
        </CardTitle>
        <CardDescription>
          Real-time monitoring of unauthorized access attempts to protected routes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No unauthorized access attempts detected</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Attempted Route</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>User Tier</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        {log.user_id.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRouteBadgeColor(log.metadata.attempted_route)}>
                        {log.metadata.attempted_route}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.metadata.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {log.metadata.user_tier || 'free'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ip_address || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
