import { Plus, Cpu, Settings, LogOut, User, BarChart2, Database, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  onNewSession: () => void;
  onLoadConversation: (conversationId: string) => void;
  currentConversationId: string | null;
}

export const Sidebar = ({ onNewSession, onLoadConversation, currentConversationId }: SidebarProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  const fetchConversations = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    setConversations(data || []);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // Prevent loading the conversation
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationToDelete);

    if (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Failed to delete conversation",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // If the deleted conversation was the current one, clear the view
    if (currentConversationId === conversationToDelete) {
      onNewSession();
    }

    // Refresh conversations list
    fetchConversations();
    
    toast({
      title: "Conversation deleted",
    });

    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  return (
    <>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <aside className="w-72 h-screen bg-[#F9FAFB] border-r border-[#E5E5EA] flex flex-col">
        {/* Header with Logo */}
        <div className="p-8 border-b border-[#E5E5EA]">
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">
            Consensus
          </h1>
          <p className="text-sm text-[#86868B] mt-1">AI Council Platform</p>
        </div>

        {/* New Session Button */}
        <div className="px-6 pt-6">
          <Button 
            variant="default"
            onClick={onNewSession}
            className="w-full h-11 rounded-full font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Audit
          </Button>
        </div>

        {/* Session History */}
        <ScrollArea className="flex-1 px-6 pt-6">
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-[#86868B] uppercase tracking-wide mb-3 px-3">
              Recent Sessions
            </h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-[#86868B] px-3 py-4">No sessions yet</p>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`w-full rounded-xl transition-all group relative ${
                    currentConversationId === conversation.id 
                      ? 'bg-white shadow-sm border border-[#E5E5EA]' 
                      : 'hover:bg-white/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-3">
                    <button
                      onClick={() => onLoadConversation(conversation.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Cpu className="w-4 h-4 text-[#0071E3] flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm text-[#111111] truncate font-medium">
                          {conversation.title}
                        </p>
                        <span className="text-xs text-[#86868B]">
                          {formatTime(conversation.updated_at)}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, conversation.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Settings at Bottom */}
        <div className="p-6 border-t border-[#E5E5EA] space-y-3">
          {session?.user && (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-[#E5E5EA]">
              <User className="w-4 h-4 text-[#86868B] flex-shrink-0" />
              <span className="text-sm text-[#111111] truncate flex-1">
                {session.user.email}
              </span>
            </div>
          )}
          <div className="grid grid-cols-5 gap-1">
            {isAdmin && (
              <button 
                onClick={() => navigate("/admin")}
                className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#0071E3]"
                title="Admin Panel"
              >
                <Shield className="w-5 h-5 mx-auto" />
              </button>
            )}
            <button 
              onClick={() => navigate("/vault")}
              className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#0071E3]"
              title="Data Vault"
            >
              <Database className="w-5 h-5 mx-auto" />
            </button>
            <button 
              onClick={() => navigate("/analytics")}
              className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#0071E3]"
              title="Performance"
            >
              <BarChart2 className="w-5 h-5 mx-auto" />
            </button>
            <button 
              onClick={() => navigate("/settings")}
              className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#0071E3]"
              title="Settings"
            >
              <Settings className="w-5 h-5 mx-auto" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#0071E3]"
              title="Logout"
            >
              <LogOut className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
