import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, RotateCcw, Calendar, User, Clock } from "lucide-react";
import { formatRelativeTime, formatDateTime } from "@/lib/intl-formatting";

interface DeletionLogMetadata {
  action: 'user_deletion' | 'user_restoration';
  deleted_by_admin_id?: string;
  restored_by_admin_id?: string;
  target_user_email: string;
  deletion_timestamp?: string;
  restoration_timestamp?: string;
  restoration_deadline?: string;
  was_deleted_at?: string;
  days_until_purge_was?: number;
}

interface DeletionLog {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  metadata: DeletionLogMetadata;
}

interface AdminProfile {
  id: string;
  email: string;
}

export function UserDeletionAuditLog() {
  const [logs, setLogs] = useState<DeletionLog[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('deletion_audit_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: 'activity_type=eq.admin_change'
        },
        (payload) => {
          const newLog = payload.new as any;
          const metadata = newLog.metadata as DeletionLogMetadata;
          if (metadata?.action === 'user_deletion' || metadata?.action === 'user_restoration') {
            setLogs(prev => [{ ...newLog, metadata } as DeletionLog, ...prev]);
            fetchAdminProfile(metadata?.deleted_by_admin_id || metadata?.restored_by_admin_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'admin_change')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter for deletion and restoration actions and type cast
      const deletionLogs = (data || [])
        .filter((log: any) => {
          const metadata = log.metadata as any;
          return metadata?.action === 'user_deletion' || metadata?.action === 'user_restoration';
        })
        .map((log: any) => ({
          ...log,
          metadata: log.metadata as DeletionLogMetadata
        })) as DeletionLog[];

      setLogs(deletionLogs);

      // Fetch admin profiles for all unique admin IDs
      const adminIds = new Set<string>();
      deletionLogs.forEach((log) => {
        if (log.metadata?.deleted_by_admin_id) adminIds.add(log.metadata.deleted_by_admin_id);
        if (log.metadata?.restored_by_admin_id) adminIds.add(log.metadata.restored_by_admin_id);
      });

      await fetchAdminProfiles(Array.from(adminIds));
    } catch (error) {
      console.error('Error fetching deletion logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminProfiles = async (adminIds: string[]) => {
    if (adminIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', adminIds);

      if (error) throw error;

      const profileMap = new Map(
        (data || []).map((profile: AdminProfile) => [profile.id, profile.email])
      );
      setAdminProfiles(profileMap);
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
    }
  };

  const fetchAdminProfile = async (adminId?: string) => {
    if (!adminId || adminProfiles.has(adminId)) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', adminId)
        .single();

      if (error) throw error;

      setAdminProfiles(prev => new Map(prev).set(data.id, data.email));
    } catch (error) {
      console.error('Error fetching admin profile:', error);
    }
  };

  const getAdminEmail = (log: DeletionLog) => {
    const adminId = log.metadata.action === 'user_deletion' 
      ? log.metadata.deleted_by_admin_id 
      : log.metadata.restored_by_admin_id;
    return adminId ? (adminProfiles.get(adminId) || 'Unknown Admin') : 'System';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Deletion Audit Log</CardTitle>
          <CardDescription>Loading audit logs...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-600" />
          User Deletion Audit Log
        </CardTitle>
        <CardDescription>
          Complete history of user deletions and restorations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deletion or restoration actions recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${
                    log.metadata.action === 'user_deletion'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {log.metadata.action === 'user_deletion' ? (
                        <Trash2 className="h-5 w-5 text-red-600" />
                      ) : (
                        <RotateCcw className="h-5 w-5 text-green-600" />
                      )}
                      <Badge
                        variant={log.metadata.action === 'user_deletion' ? 'destructive' : 'default'}
                        className={log.metadata.action === 'user_restoration' ? 'bg-green-600' : ''}
                      >
                        {log.metadata.action === 'user_deletion' ? 'DELETED' : 'RESTORED'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(log.created_at, { style: 'short' })}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Target User:</span>
                      <span className="text-muted-foreground">{log.metadata.target_user_email}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        ({log.user_id.slice(0, 8)}...)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Performed By:</span>
                      <span className="text-muted-foreground">{getAdminEmail(log)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Timestamp:</span>
                      <span className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>

                    {log.metadata.action === 'user_deletion' && log.metadata.restoration_deadline && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Purge Date:</span>
                        <span className="text-muted-foreground">
                          {new Date(log.metadata.restoration_deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {log.metadata.action === 'user_restoration' && log.metadata.was_deleted_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Was Deleted:</span>
                        <span className="text-muted-foreground">
                          {new Date(log.metadata.was_deleted_at).toLocaleDateString()}
                        </span>
                        {log.metadata.days_until_purge_was !== undefined && (
                          <Badge variant="outline" className="ml-2">
                            Restored with {Math.round(log.metadata.days_until_purge_was)} days remaining
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-muted-foreground italic">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
