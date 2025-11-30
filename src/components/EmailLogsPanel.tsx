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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatRelativeTime } from "@/lib/intl-formatting";

interface EmailLog {
  id: string;
  user_id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  metadata: any;
  sent_by: string | null;
  sent_at: string;
  error_message: string | null;
  message_id: string | null;
}

export const EmailLogsPanel = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchEmailLogs();

    // Set up real-time subscription
    const channel = supabase
      .channel('email_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_logs',
        },
        () => {
          fetchEmailLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmailLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
            <CheckCircle className="h-3 w-3" />
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-[#0071E3]" />
          <h2 className="text-2xl font-bold text-[#111111]">Email History</h2>
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredLogs.length} emails
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868B] w-4 h-4" />
          <Input
            placeholder="Search by email, user ID, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-[#E5E5EA]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-[#E5E5EA]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={fetchEmailLogs}
          className="border-[#E5E5EA]"
        >
          Refresh
        </Button>
      </div>

      {/* Email Logs Table */}
      <div className="rounded-2xl border border-[#E5E5EA] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB]">
              <TableHead className="font-semibold text-[#111111]">Status</TableHead>
              <TableHead className="font-semibold text-[#111111]">Recipient</TableHead>
              <TableHead className="font-semibold text-[#111111]">Subject</TableHead>
              <TableHead className="font-semibold text-[#111111]">Details</TableHead>
              <TableHead className="font-semibold text-[#111111]">Sent By</TableHead>
              <TableHead className="font-semibold text-[#111111]">Sent At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#86868B]">
                  Loading email logs...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-[#86868B]">
                  No email logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm text-[#111111]">{log.recipient_email}</div>
                      <div className="font-mono text-xs text-[#86868B]">
                        {log.user_id.slice(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#111111] max-w-xs truncate">
                    {log.subject}
                  </TableCell>
                  <TableCell>
                    {log.metadata && (
                      <div className="space-y-1 text-xs">
                        {log.metadata.previous_status && log.metadata.new_status && (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {log.metadata.previous_status}
                            </Badge>
                            <span className="text-[#86868B]">→</span>
                            <Badge variant="outline" className="text-xs">
                              {log.metadata.new_status}
                            </Badge>
                          </div>
                        )}
                        {log.metadata.reason && (
                          <div className="text-[#86868B] truncate max-w-xs">
                            {log.metadata.reason}
                          </div>
                        )}
                        {log.error_message && (
                          <div className="text-red-600 truncate max-w-xs">
                            {log.error_message}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#86868B]">
                    {log.sent_by ? `${log.sent_by.slice(0, 8)}...` : 
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-sm text-[#86868B]">
                    {formatRelativeTime(log.sent_at, { style: 'short' })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-4">
          <div className="text-sm text-[#86868B] mb-1">Total Sent</div>
          <div className="text-2xl font-bold text-[#111111]">
            {logs.filter(l => l.status === 'sent').length}
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-4">
          <div className="text-sm text-[#86868B] mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {logs.filter(l => l.status === 'failed').length}
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-4">
          <div className="text-sm text-[#86868B] mb-1">Success Rate</div>
          <div className="text-2xl font-bold text-green-600">
            {logs.length > 0 
              ? Math.round((logs.filter(l => l.status === 'sent').length / logs.length) * 100)
              : 0}%
          </div>
        </div>
      </div>
    </div>
  );
};