import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Briefcase, CheckCircle2, ArrowLeft, LogOut, Brain } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Step = 1 | 2 | 3 | 4;

const industries = [
  { value: "legal", label: "Legal", description: "Law firms, compliance, contracts" },
  { value: "medical", label: "Medical", description: "Healthcare, diagnostics, research" },
  { value: "technology", label: "Technology", description: "Software, engineering, IT" },
  { value: "finance", label: "Finance", description: "Banking, investment, accounting" },
  { value: "marketing", label: "Marketing", description: "Advertising, content, campaigns" },
];

export default function SetupTeam() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [teamName, setTeamName] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleSkip = () => {
    navigate("/app");
  };

  const handleCreateOrganization = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    if (!industry) {
      toast.error("Please select an industry");
      return;
    }

    setLoading(true);
    setStep(3); // Show "Assigning Specialists..." loader

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: teamName,
          owner_id: user.id,
          subscription_tier: "team",
          industry: industry,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user's organization_id in user_usage
      const { error: usageError } = await supabase
        .from("user_usage")
        .update({ organization_id: org.id })
        .eq("user_id", user.id);

      if (usageError) throw usageError;

      // Simulate loading for dramatic effect
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setStep(4); // Show success
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(`${teamName} created successfully!`);
      navigate("/team");
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error("Failed to create team");
      setStep(2); // Go back to industry selection
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Navigation Header */}
      <header className="bg-white border-b border-[#E5E5EA] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2 text-[#86868B] hover:text-[#111111]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <span className="font-semibold text-[#111111]">Consensus</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {userEmail.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-[#86868B]">{userEmail}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center p-6 pt-12">
        <Card className="w-full max-w-2xl border-[#E5E5EA] shadow-lg">
        <CardHeader className="text-center border-b border-[#E5E5EA]">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#0055B8] flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#111111]">
            {step === 1 && "Create Your Team"}
            {step === 2 && "Select Your Industry"}
            {step === 3 && "Assigning Specialists..."}
            {step === 4 && "All Set!"}
          </CardTitle>
          <CardDescription className="text-[#86868B]">
            {step === 1 && "Let's get your organization set up"}
            {step === 2 && "We'll recommend AI models tailored to your industry"}
            {step === 3 && "Configuring your AI Council with industry experts"}
            {step === 4 && "Your team is ready to go"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="teamName" className="text-[#111111] font-medium">
                  Team Name
                </Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Acme Legal Partners"
                  className="mt-2 h-12 border-[#E5E5EA]"
                  autoFocus
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!teamName.trim()}
                className="w-full h-12 bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium rounded-xl"
              >
                Continue
              </Button>
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="w-full text-[#86868B] hover:text-[#111111]"
              >
                Skip for now
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-[#111111] font-medium mb-3 block">
                  What industry are you in?
                </Label>
                <div className="grid gap-3">
                  {industries.map((ind) => (
                    <button
                      key={ind.value}
                      onClick={() => setIndustry(ind.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        industry === ind.value
                          ? "border-[#0071E3] bg-blue-50"
                          : "border-[#E5E5EA] hover:border-[#0071E3]/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-[#0071E3]" />
                        <div className="flex-1">
                          <p className="font-semibold text-[#111111]">{ind.label}</p>
                          <p className="text-sm text-[#86868B]">{ind.description}</p>
                        </div>
                        {industry === ind.value && (
                          <CheckCircle2 className="w-5 h-5 text-[#0071E3]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-[#E5E5EA]"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateOrganization}
                    disabled={!industry || loading}
                    className="flex-1 h-12 bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium rounded-xl"
                  >
                    Create Team
                  </Button>
                </div>
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  className="w-full text-[#86868B] hover:text-[#111111]"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-12 text-center space-y-6">
              <Loader2 className="w-16 h-16 mx-auto text-[#0071E3] animate-spin" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-[#111111]">
                  Analyzing your industry needs...
                </p>
                <p className="text-sm text-[#86868B]">
                  Selecting optimal AI models for {industries.find((i) => i.value === industry)?.label}
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="py-12 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-[#111111]">Team Created Successfully!</p>
                <p className="text-sm text-[#86868B]">
                  Your AI Council is configured with industry-specific experts
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
