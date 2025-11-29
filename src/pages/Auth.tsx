import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if IP is blocked before allowing signup
      const { data: ipCheckData, error: ipCheckError } = await supabase.functions.invoke('check-ip-block');
      
      if (ipCheckError) {
        console.error('Error checking IP block:', ipCheckError);
        // Continue with signup even if check fails (fail open for better UX)
      } else if (ipCheckData?.blocked) {
        toast({
          title: "Account Creation Restricted",
          description: ipCheckData.message || "Unable to create account from your current location.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/app`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Account created successfully. You can now sign in.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check account status and suspension immediately after successful login
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('account_status, suspended_until')
        .eq('user_id', authData.user.id)
        .single();

      if (usageError) {
        console.error('Error checking account status:', usageError);
      } else if (usageData) {
        // Check if account is temporarily suspended
        if (usageData.account_status === 'inactive' && usageData.suspended_until) {
          const suspendedUntil = new Date(usageData.suspended_until);
          if (suspendedUntil > new Date()) {
            const minutes = Math.ceil((suspendedUntil.getTime() - Date.now()) / 60000);
            await supabase.auth.signOut();
            toast({
              title: "Account Suspended",
              description: `Your account is temporarily suspended due to repeated unauthorized access attempts. Try again in ${minutes} minutes.`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
        
        // If account is disabled, sign out and show error
        if (usageData.account_status === 'disabled') {
          await supabase.auth.signOut();
          toast({
            title: "Account Disabled",
            description: "Your account has been disabled. Please contact support.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Store login timestamp for session duration tracking
      localStorage.setItem('session_start', new Date().toISOString());

      // Log login activity in background
      supabase.functions.invoke('log-activity', {
        body: {
          activity_type: 'login',
          description: 'User signed in successfully',
          metadata: {
            method: 'email_password'
          }
        }
      }).catch(err => console.error('Failed to log login activity:', err));

      navigate("/app");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-[#111111] mb-3 tracking-tight">
            Welcome to Consensus
          </h1>
          <p className="text-[#86868B] text-base">
            Multi-model AI analysis for precision decisions
          </p>
        </div>

        {/* Floating Auth Card */}
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-8 shadow-xl">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#F5F5F7] rounded-xl p-1">
              <TabsTrigger 
                value="signin" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-semibold text-[#111111]">
                    Email Address
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-semibold text-[#111111]">
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-semibold text-[#111111]">
                    Email Address
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 text-base border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-semibold text-[#111111]">
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-12 text-base border-[#E5E5EA] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-full text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
                <p className="text-sm text-[#86868B] text-center">
                  Start with 3 free monthly audits
                </p>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 pt-6 border-t border-[#E5E5EA] text-center">
            <Link to="/pricing">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#0071E3] hover:text-[#0071E3]/80 text-sm font-medium"
              >
                View Membership Options →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
