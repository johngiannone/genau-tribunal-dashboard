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

      <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Header with Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight font-mono">
          GENAU
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">CONSENSUS ENGINE</p>
      </div>

      {/* New Session Button */}
      <div className="p-4">
        <Button 
          variant="ghost"
          onClick={onNewSession}
          className="w-full border border-sidebar-primary text-sidebar-primary hover:bg-sidebar-primary hover:text-sidebar-primary-foreground font-semibold transition-all font-mono"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Session History */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-0.5">
          <h3 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2 font-mono">
            Recent Sessions
          </h3>
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 px-2 py-2">No sessions yet</p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`w-full rounded hover:bg-sidebar-accent/50 transition-all group ${
                  currentConversationId === conversation.id ? 'bg-sidebar-accent/30' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1 px-2 py-2">
                  <button
                    onClick={() => onLoadConversation(conversation.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <Cpu className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
                    <p className="text-xs text-muted-foreground/70 group-hover:text-sidebar-foreground truncate">
                      {conversation.title}
                    </p>
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      {formatTime(conversation.updated_at)}
                    </span>
                    <button
                      onClick={(e) => handleDeleteClick(e, conversation.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Settings at Bottom */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {session?.user && (
          <div className="flex items-center gap-2 px-2 py-2 rounded bg-sidebar-accent/30">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate flex-1">
              {session.user.email}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => navigate("/admin")}
              className="p-2 rounded hover:bg-sidebar-accent/50 transition-all text-muted-foreground hover:text-sidebar-foreground"
              title="Admin Panel"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => navigate("/vault")}
            className="p-2 rounded hover:bg-sidebar-accent/50 transition-all text-muted-foreground hover:text-sidebar-foreground"
            title="Data Vault"
          >
            <Database className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigate("/analytics")}
            className="p-2 rounded hover:bg-sidebar-accent/50 transition-all text-muted-foreground hover:text-sidebar-foreground"
            title="Performance"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => navigate("/settings")}
            className="p-2 rounded hover:bg-sidebar-accent/50 transition-all text-muted-foreground hover:text-sidebar-foreground"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 rounded hover:bg-sidebar-accent/50 transition-all text-muted-foreground hover:text-sidebar-foreground"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
};
