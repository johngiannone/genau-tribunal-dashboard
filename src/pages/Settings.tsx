import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Key, CreditCard, User, Trash2, Settings2, BookOpen, Sparkles, Users, Palette, Shield, Download, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { KnowledgeBaseTab } from "@/components/KnowledgeBaseTab";
import { TeamManagementTab } from "@/components/TeamManagementTab";
import { BrandingSettingsTab } from "@/components/BrandingSettingsTab";
import { useUserRole } from "@/hooks/useUserRole";

const Settings = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [usage, setUsage] = useState<{ audit_count: number; is_premium: boolean } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enableRecommendations, setEnableRecommendations] = useState(true);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [deleteDataDialogOpen, setDeleteDataDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tier } = useUserRole();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user) {
      fetchUsage();
      fetchPreferences();
    }
  }, [session]);

  const fetchUsage = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('user_usage')
      .select('audit_count, is_premium')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error("Error fetching usage:", error);
      return;
    }

    setUsage(data);
  };

  const fetchPreferences = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('enable_model_recommendations')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching preferences:", error);
      return;
    }

    if (data) {
      setEnableRecommendations(data.enable_model_recommendations ?? true);
    }
  };

  const handleToggleRecommendations = async (checked: boolean) => {
    if (!session?.user) return;
    
    setIsLoadingPreferences(true);
    setEnableRecommendations(checked);

    const { error } = await supabase
      .from('profiles')
      .update({ enable_model_recommendations: checked })
      .eq('id', session.user.id);

    setIsLoadingPreferences(false);

    if (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Failed to update preference",
        description: error.message,
        variant: "destructive",
      });
      setEnableRecommendations(!checked);
      return;
    }

    toast({
      title: checked ? "Recommendations enabled" : "Recommendations disabled",
      description: checked 
        ? "AI will suggest optimal models before each audit" 
        : "You'll use your configured council for all audits",
    });
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Password updated successfully",
    });

    setNewPassword("");
    setConfirmPassword("");
  };

  const handleExportData = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      // Convert data to JSON blob and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `genau-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your data has been downloaded",
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const handleDeleteData = async () => {
    if (!session?.user) return;

    try {
      // Delete conversations and messages
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .eq('user_id', session.user.id);

      if (conversationsError) throw conversationsError;

      // Delete training dataset (audit history)
      const { error: auditsError } = await supabase
        .from('training_dataset')
        .delete()
        .eq('user_id', session.user.id);

      if (auditsError) throw auditsError;

      // Reset usage counters
      const { error: usageError } = await supabase
        .from('user_usage')
        .update({ audit_count: 0, audits_this_month: 0, files_this_month: 0 })
        .eq('user_id', session.user.id);

      if (usageError) throw usageError;

      toast({
        title: "Data deleted",
        description: "Your audit history and conversations have been cleared",
      });

      setDeleteDataDialogOpen(false);
      
      // Reload to reflect changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Delete data error:", error);
      toast({
        title: "Failed to delete data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user) return;
    
    if (deleteConfirmation !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: "Please type DELETE to confirm",
        variant: "destructive",
      });
      return;
    }

    try {
      // Sign out the user
      await supabase.auth.signOut();
      
      toast({
        title: "Account deletion requested",
        description: "Please contact support@genau.io to complete account deletion",
      });

      setDeleteAccountDialogOpen(false);
      navigate("/auth");
    } catch (error: any) {
      console.error("Delete account error:", error);
      toast({
        title: "Failed to process request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-sidebar">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
          </div>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details and subscription status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-muted/50"
              />
            </div>
            
            <Separator />

            <div className="space-y-2">
              <Label>Subscription Status</Label>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="font-semibold text-sidebar-primary">
                    {usage?.is_premium ? "Premium Member" : "Free Tier"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {usage?.is_premium 
                      ? "Unlimited audits" 
                      : `${usage?.audit_count || 0} / 5 audits used today`
                    }
                  </p>
                </div>
                {!usage?.is_premium && (
                  <Button
                    onClick={() => navigate("/pricing")}
                    className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Council Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              AI Council Configuration
            </CardTitle>
            <CardDescription>
              Customize the AI models used in your consensus engine
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/settings/council")}
            >
              Configure Council
            </Button>
          </CardContent>
        </Card>

        {/* Team Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Workspace
            </CardTitle>
            <CardDescription>
              Create or manage your team organization for collaborative audits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/setup-team")}
            >
              Set Up Team
            </Button>
          </CardContent>
        </Card>

        {/* Model Recommendations Preference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Smart Model Recommendations
            </CardTitle>
            <CardDescription>
              Let AI suggest optimal model combinations based on your prompt type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="recommendations-toggle" className="text-base">
                  Enable automatic recommendations
                </Label>
                <p className="text-sm text-muted-foreground">
                  {enableRecommendations 
                    ? "AI will analyze your prompts and suggest the best models before each audit"
                    : "You'll use your configured council for all audits without suggestions"
                  }
                </p>
              </div>
              <Switch
                id="recommendations-toggle"
                checked={enableRecommendations}
                onCheckedChange={handleToggleRecommendations}
                disabled={isLoadingPreferences}
              />
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Knowledge Base
            </CardTitle>
            <CardDescription>
              Upload brand guidelines for the Council to reference during audits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KnowledgeBaseTab />
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword}
              className="w-full"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Privacy & Data
            </CardTitle>
            <CardDescription>Manage your personal data and account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export My Data */}
            <div className="flex items-start justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-start gap-3 flex-1">
                <Download className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Export My Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of all your data including audit history, conversations, and settings
                  </p>
                </div>
              </div>
              <Button onClick={handleExportData} variant="outline" size="sm">
                Export Data
              </Button>
            </div>

            {/* Delete My Data */}
            <div className="flex items-start justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-start gap-3 flex-1">
                <Eraser className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Delete My Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Clear your audit history and conversations while keeping your account active
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setDeleteDataDialogOpen(true)} 
                variant="outline" 
                size="sm"
              >
                Delete Data
              </Button>
            </div>

            <Separator />

            {/* Delete Account */}
            <div className="flex items-start justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-3 flex-1">
                <Trash2 className="w-5 h-5 mt-0.5 text-destructive" />
                <div>
                  <h3 className="font-semibold text-destructive">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setDeleteAccountDialogOpen(true)} 
                variant="outline" 
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Data Confirmation Dialog */}
        <AlertDialog open={deleteDataDialogOpen} onOpenChange={setDeleteDataDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All audit history</li>
                  <li>All conversations and messages</li>
                  <li>Usage statistics</li>
                </ul>
                <br />
                Your account will remain active, but all your data will be cleared. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteData}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete My Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all associated data. This action cannot be undone.
                <br /><br />
                Type <strong>DELETE</strong> to confirm:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="mt-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== "DELETE"}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Settings;
