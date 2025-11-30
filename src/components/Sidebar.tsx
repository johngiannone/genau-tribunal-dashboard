import { Plus, Cpu, Settings, LogOut, User, BarChart2, Database, Shield, Trash2, CreditCard, Folder, FolderPlus, Users } from "lucide-react";
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

export const Sidebar = ({
  onNewSession,
  onLoadConversation,
  currentConversationId,
}: SidebarProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { isAdmin, tier } = useUserRole();
  const { toast } = useToast();

  const canAccessBilling = ['team', 'agency'].includes(tier || '') || isAdmin;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchConversations();
        fetchFolders();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchConversations();
        fetchFolders();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

    const { data, error } = await supabase
      .from('project_folders')
      .insert({
        user_id: session.user.id,
        name: newFolderName,
        color: '#0071E3',
        icon: 'folder',
        position: folders.length
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Log folder creation
    await supabase.functions.invoke('log-activity', {
      body: {
        activity_type: 'folder_created',
        description: `Created folder: ${data.name}`,
        metadata: { folder_id: data.id, folder_name: data.name }
      }
    });

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

    // Log conversation move
    const folderName = folderId ? folders.find(f => f.id === folderId)?.name : "Unfiled";
    await supabase.functions.invoke('log-activity', {
      body: {
        activity_type: 'conversation_moved_to_folder',
        description: `Moved conversation to ${folderName}`,
        metadata: { conversation_id: conversationId, folder_id: folderId, folder_name: folderName }
      }
    });

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

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleDeleteConversation = async () => {
    if (!deleteConversationId) return;

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", deleteConversationId);

    if (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Failed to delete conversation",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (currentConversationId === deleteConversationId) {
      onNewSession();
    }

    fetchConversations();
    setShowDeleteDialog(false);
    setDeleteConversationId(null);
    toast({
      title: "Conversation deleted",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
      <div className="w-[280px] bg-[#F5F5F7] border-r border-[#E5E5EA] flex flex-col h-screen">
        {/* Header */}
        <div className="p-6 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#0055B8] flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1D1D1F]">Genau</h1>
              <p className="text-xs text-[#86868B]">AI Auditor</p>
            </div>
          </div>

          <Button
            onClick={onNewSession}
            className="w-full bg-white hover:bg-[#F5F5F7] text-[#0071E3] border border-[#0071E3] rounded-xl transition-all shadow-none hover:shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>

        {/* Folders Section */}
        <ScrollArea className="flex-1">
          {folders.length > 0 && (
            <div className="px-3 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
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

              {/* All Sessions folder */}
              <button
                onClick={() => setActiveFolderId(null)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all mb-1 ${
                  activeFolderId === null
                    ? 'bg-white shadow-sm border border-[#E5E5EA]'
                    : 'hover:bg-white'
                }`}
              >
                <Folder className="w-4 h-4 text-[#0071E3]" />
                <span className="text-sm text-[#1D1D1F]">All Sessions</span>
              </button>

              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all mb-1 ${
                    activeFolderId === folder.id
                      ? 'bg-white shadow-sm border border-[#E5E5EA]'
                      : 'hover:bg-white'
                  }`}
                >
                  <Folder className="w-4 h-4" style={{ color: folder.color }} />
                  <span className="text-sm text-[#1D1D1F] truncate flex-1">{folder.name}</span>
                  <span className="text-xs text-[#86868B]">
                    {conversations.filter(c => c.folder_id === folder.id).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1 px-3 pb-3">
            <div className="flex items-center justify-between mb-3 mt-4">
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
                      : 'hover:bg-white'
                  }`}
                >
                  <button
                    onClick={() => onLoadConversation(conversation.id)}
                    className="w-full text-left px-4 py-3 flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1D1D1F] truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-[#86868B] mt-1">
                        {formatTime(conversation.updated_at)}
                      </p>
                    </div>
                  </button>

                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <select
                      onChange={(e) => {
                        e.stopPropagation();
                        handleMoveToFolder(conversation.id, e.target.value || null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      value={conversation.folder_id || ''}
                      className="text-xs bg-white border border-[#E5E5EA] rounded px-1 py-0.5"
                      title="Move to folder"
                    >
                      <option value="">Unfiled</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConversationId(conversation.id);
                        setShowDeleteDialog(true);
                      }}
                      className="p-1 rounded hover:bg-[#FF3B30]/10 transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3 text-[#FF3B30]" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5EA] space-y-2">
          {session?.user?.email && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl mb-2">
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
            {canAccessBilling && (
              <button 
                onClick={() => navigate("/team")}
                className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#0071E3]"
                title="Team"
              >
                <Users className="w-5 h-5 mx-auto" />
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
              className="p-3 rounded-xl hover:bg-white transition-all text-[#86868B] hover:text-[#FF3B30]"
              title="Logout"
            >
              <LogOut className="w-5 h-5 mx-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your sessions into folders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
