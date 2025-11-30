import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export const TeamSetupBanner = () => {
  const [visible, setVisible] = useState(false);
  const [hasOrganization, setHasOrganization] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkOrganizationStatus = async () => {
      // Check if banner was dismissed
      const dismissed = localStorage.getItem("team_setup_banner_dismissed");
      if (dismissed === "true") {
        setVisible(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has an organization
      const { data: usageData } = await supabase
        .from("user_usage")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (usageData?.organization_id) {
        setHasOrganization(true);
        setVisible(false);
      } else {
        setHasOrganization(false);
        setVisible(true);
      }
    };

    checkOrganizationStatus();
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("team_setup_banner_dismissed", "true");
    setVisible(false);
  };

  const handleSetupTeam = () => {
    navigate("/setup-team");
  };

  if (!visible || hasOrganization) {
    return null;
  }

  return (
    <Alert className="relative border-[#0071E3]/20 bg-blue-50/50 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <Users className="h-5 w-5 text-[#0071E3]" />
        </div>
        <div className="flex-1">
          <AlertDescription className="text-[#111111]">
            <span className="font-semibold">Create your team workspace</span>
            <p className="text-sm text-[#86868B] mt-1">
              Set up your organization to collaborate with team members, share knowledge base documents, and manage collective audits.
            </p>
          </AlertDescription>
          <div className="flex gap-3 mt-3">
            <Button
              size="sm"
              onClick={handleSetupTeam}
              className="bg-[#0071E3] hover:bg-[#0077ED] text-white h-8"
            >
              Set Up Team
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-[#86868B] hover:text-[#111111] h-8"
            >
              Maybe later
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-[#86868B] hover:text-[#111111] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Alert>
  );
};
