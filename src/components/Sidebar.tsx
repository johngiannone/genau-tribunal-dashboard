import { Plus, Cpu, Settings, LogOut, User, BarChart2, Database, Shield, Trash2, CreditCard, Folder, FolderPlus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  folder_id: string | null;
}

interface ProjectFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
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
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAdmin, canAccessBilling } = useUserRole();
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
      fetchFolders();
    }
  }, [session]);

  const fetchConversations = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, updated_at, folder_id')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    setConversations(data || []);
  };

  const fetchFolders = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('project_folders')
      .select('*')
      .eq('user_id', session.user.id)
      .order('position', { ascending: true });

    if (error) {
      console.error("Error fetching folders:", error);
      return;
    }

    setFolders(data || []);
  };

  const handleCreateFolder = async () => {
    if (!session?.user || !newFolderName.trim()) return;

    const { error } = await supabase
      .from('project_folders')
      .insert({
        user_id: session.user.id,
        name: newFolderName,
        color: '#0071E3',
        icon: 'folder',
        position: folders.length
      });

    if (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNewFolderName("");
    setCreateFolderOpen(false);
    fetchFolders();
    toast({
      title: "Folder created",
    });
  };

  const handleMoveToFolder = async (conversationId: string, folderId: string | null) => {
    const { error } = await supabase
      .from('conversations')
      .update({ folder_id: folderId })
      .eq('id', conversationId);

    if (error) {
      console.error("Error moving conversation:", error);
      toast({
        title: "Failed to move conversation",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    fetchConversations();
    toast({
      title: "Conversation moved",
    });
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
    // Calculate session duration
    const sessionStart = localStorage.getItem('session_start');
    const sessionDurationMs = sessionStart 
      ? Date.now() - new Date(sessionStart).getTime()
      : 0;
    const sessionDurationMinutes = Math.round(sessionDurationMs / 60000);

    // Log logout activity in background
    supabase.functions.invoke('log-activity', {
      body: {
        activity_type: 'logout',
        description: 'User signed out',
        metadata: {
          session_duration_minutes: sessionDurationMinutes,
          session_duration_ms: sessionDurationMs
        }
      }
    }).catch(err => console.error('Failed to log logout activity:', err));

    // Clear session start timestamp
    localStorage.removeItem('session_start');

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

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Organize your conversations into folders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {/* Folders Section */}
          {folders.length > 0 && (
            <div className="space-y-1 mb-6">
              <div className="flex items-center justify-between px-3 mb-3">
                <h3 className="text-xs font-semibold text-[#86868B] uppercase tracking-wide">
                  Folders
                </h3>
                <button
                  onClick={() => setCreateFolderOpen(true)}
                  className="p-1 hover:bg-white rounded-lg transition-all"
                  title="Create folder"
                >
                  <FolderPlus className="w-4 h-4 text-[#86868B]" />
                </button>
              </div>
              <button
                onClick={() => setActiveFolderId(null)}
                className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
                  activeFolderId === null
                    ? 'bg-white shadow-sm border border-[#E5E5EA]'
                    : 'hover:bg-white/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#0071E3]" />
                  <span className="text-sm font-medium text-[#111111]">All Sessions</span>
                  <span className="ml-auto text-xs text-[#86868B]">
                    {conversations.length}
                  </span>
                </div>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
                    activeFolderId === folder.id
                      ? 'bg-white shadow-sm border border-[#E5E5EA]'
                      : 'hover:bg-white/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4" style={{ color: folder.color }} />
                    <span className="text-sm font-medium text-[#111111]">{folder.name}</span>
                    <span className="ml-auto text-xs text-[#86868B]">
                      {conversations.filter(c => c.folder_id === folder.id).length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 mb-3">
              <h3 className="text-xs font-semibold text-[#86868B] uppercase tracking-wide">
                {activeFolderId ? 'Sessions in Folder' : 'Recent Sessions'}
              </h3>
              {folders.length === 0 && (
                <button
                  onClick={() => setCreateFolderOpen(true)}
                  className="p-1 hover:bg-white rounded-lg transition-all"
                  title="Create folder"
                >
                  <FolderPlus className="w-4 h-4 text-[#86868B]" />
                </button>
              )}
            </div>
            {conversations.filter(c => activeFolderId ? c.folder_id === activeFolderId : true).length === 0 ? (
              <p className="text-sm text-[#86868B] px-3 py-4">No sessions yet</p>
            ) : (
              conversations.filter(c => activeFolderId ? c.folder_id === activeFolderId : true).map((conversation) => (
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
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      {folders.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextFolderId = conversation.folder_id 
                              ? null 
                              : folders[0]?.id || null;
                            handleMoveToFolder(conversation.id, nextFolderId);
                          }}
                          className="p-1.5 hover:bg-[#0071E3]/10 rounded-lg transition-all"
                          title={conversation.folder_id ? "Remove from folder" : "Move to folder"}
                        >
                          <Folder className="w-4 h-4 text-[#0071E3]" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteClick(e, conversation.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition-all"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
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
          <div className="grid grid-cols-6 gap-1">
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
            {canAccessBilling && (
              <button 
                onClick={() => navigate("/settings/billing")}
                className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#0071E3]"
                title="Billing"
              >
                <CreditCard className="w-5 h-5 mx-auto" />
              </button>
            )}
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
