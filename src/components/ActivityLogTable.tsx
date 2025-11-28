import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export const ActivityLogTable = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityBadge = (type: string) => {
    const badges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      login: { variant: "default", label: "Login" },
      logout: { variant: "secondary", label: "Logout" },
      audit_completed: { variant: "default", label: "Audit" },
      admin_change: { variant: "destructive", label: "Admin Change" },
      profile_update: { variant: "outline", label: "Profile Update" },
      file_upload: { variant: "outline", label: "File Upload" },
    };
    
    const badge = badges[type] || { variant: "outline" as const, label: type };
    return (
      <Badge variant={badge.variant} className="font-mono text-xs">
        {badge.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071E3]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-[#0071E3]" />
        <h2 className="text-2xl font-bold text-[#111111]">Activity Log</h2>
      </div>

      <div className="rounded-2xl border border-[#E5E5EA] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead className="font-semibold text-[#111111]">Time</TableHead>
              <TableHead className="font-semibold text-[#111111]">User ID</TableHead>
              <TableHead className="font-semibold text-[#111111]">Type</TableHead>
              <TableHead className="font-semibold text-[#111111]">Description</TableHead>
              <TableHead className="font-semibold text-[#111111]">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#86868B]">
                  No activity logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-[#F9FAFB]/50">
                  <TableCell className="text-sm text-[#86868B]">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#86868B]">
                    {log.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{getActivityBadge(log.activity_type)}</TableCell>
                  <TableCell className="text-sm text-[#111111] max-w-md truncate">
                    {log.description}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#86868B]">
                    {log.ip_address || "N/A"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
