import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Ticket, Mail, Calendar, MessageSquare, Plus, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CreateTicketModal } from "@/components/CreateTicketModal";

export default function Tickets() {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [resolveTicketId, setResolveTicketId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          assigned_admin:profiles!assigned_to(email)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["ticket-comments", selectedTicket],
    queryFn: async () => {
      if (!selectedTicket) return [];

      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", selectedTicket)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTicket,
  });

  // Real-time subscription for new comments
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel('ticket-comments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_comments',
          filter: `ticket_id=eq.${selectedTicket}`,
        },
        (payload) => {
          console.log('New comment received:', payload);
          // Refetch comments to show the new reply
          refetchComments();
          
          // Show toast notification if it's from admin
          if (payload.new?.is_admin) {
            toast({
              title: "New reply from support",
              description: "Support team has replied to your ticket",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket, refetchComments, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  const handleAddReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: selectedTicket,
          user_id: user.id,
          comment: replyText,
          is_admin: false,
        });

      if (error) throw error;

      toast({
        title: "Reply sent",
        description: "Support team will be notified",
      });

      setReplyText("");
      refetchComments();
    } catch (error: any) {
      toast({
        title: "Failed to send reply",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMarkAsResolved = async () => {
    if (!resolveTicketId) return;

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "resolved" })
        .eq("id", resolveTicketId);

      if (error) throw error;

      toast({
        title: "Ticket marked as resolved",
        description: "Thank you for confirming the issue is fixed",
      });

      setResolveTicketId(null);
      
      // Refetch tickets to show updated status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Failed to update ticket",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => navigate(`/${lang || 'en'}/app`)}
                className="cursor-pointer hover:text-foreground"
              >
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => navigate(`/${lang || 'en'}/support`)}
                className="cursor-pointer hover:text-foreground"
              >
                Support
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Tickets</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-black mb-2">My Support Tickets</h1>
              <p className="text-gray-500">Track the status of your submitted tickets</p>
            </div>
            <Button onClick={() => setCreateTicketOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              <CardTitle>Your Tickets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <p>Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-semibold text-lg text-black mb-1">No tickets yet</p>
                <p className="text-sm mb-4">You haven't submitted any support tickets.</p>
                <Button onClick={() => setCreateTicketOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Your First Ticket
                </Button>
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
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            #{ticket.id.split('-')[0].toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-black mb-1">{ticket.subject}</h3>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
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
                        {ticket.assigned_admin && (
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            Assigned to: {ticket.assigned_admin.email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setResolveTicketId(ticket.id)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            Mark as Resolved
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicket(ticket.id)}
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          View Conversation
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ticket Conversation</DialogTitle>
              <DialogDescription>
                {selectedTicket && tickets.find(t => t.id === selectedTicket)?.subject}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Original ticket */}
              {selectedTicket && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Original Report</Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(tickets.find(t => t.id === selectedTicket)?.created_at || ''), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {tickets.find(t => t.id === selectedTicket)?.description}
                  </p>
                </div>
              )}

              {/* Comments */}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`border rounded-lg p-4 ${
                    comment.is_admin
                      ? 'bg-blue-50 border-blue-200 ml-8'
                      : 'bg-white border-gray-200 mr-8'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={comment.is_admin ? "default" : "secondary"}>
                      {comment.is_admin ? 'Support Team' : 'You'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-center text-gray-500 py-8">No replies yet</p>
              )}
            </div>

            {/* Reply form */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">Add Reply</label>
              <Textarea
                placeholder="Type your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                className="mb-3"
              />
              <Button onClick={handleAddReply} disabled={!replyText.trim()}>
                Send Reply
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Ticket Modal */}
        <CreateTicketModal
          open={createTicketOpen}
          onOpenChange={setCreateTicketOpen}
        />

        {/* Resolve Confirmation Dialog */}
        <AlertDialog open={!!resolveTicketId} onOpenChange={() => setResolveTicketId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark ticket as resolved?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark your support ticket as resolved and close it. You can always create a new ticket if you need further assistance.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAsResolved} className="bg-green-600 hover:bg-green-700">
                Mark as Resolved
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
