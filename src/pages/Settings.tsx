import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Key, CreditCard, User, Trash2, Settings2, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";
import { KnowledgeBaseTab } from "@/components/KnowledgeBaseTab";

const Settings = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [usage, setUsage] = useState<{ audit_count: number; is_premium: boolean } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enableRecommendations, setEnableRecommendations] = useState(true);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmed) return;

    // Note: Account deletion would typically be handled by a backend function
    // For now, we'll just sign out
    toast({
      title: "Notice",
      description: "Please contact support to delete your account",
    });
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

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible account actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              className="w-full"
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
