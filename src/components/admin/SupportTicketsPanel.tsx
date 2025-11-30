import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket, Mail, Calendar, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export const SupportTicketsPanel = () => {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ["support-tickets", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Ticket marked as ${newStatus}`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-500";
      case "in_progress":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            <CardTitle>Support Tickets</CardTitle>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No support tickets found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline">{ticket.subject}</Badge>
                      <span className="text-xs text-gray-500">
                        #{ticket.id.split('-')[0].toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                      {ticket.description}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(ticket.status)}`} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {ticket.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </div>
                    {ticket.screenshot_url && (
                      <a
                        href={ticket.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Screenshot
                      </a>
                    )}
                  </div>

                  <Select
                    value={ticket.status}
                    onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
