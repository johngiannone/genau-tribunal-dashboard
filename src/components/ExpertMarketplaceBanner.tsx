import { useState } from "react";
import { UserCheck, X } from "lucide-react";
import { Button } from "./ui/button";

interface ExpertMarketplaceBannerProps {
  onClose: () => void;
}

export const ExpertMarketplaceBanner = ({ onClose }: ExpertMarketplaceBannerProps) => {
  const handleExpertClick = async () => {
    // Log click for analytics
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.functions.invoke('log-activity', {
      body: {
        activity_type: 'expert_marketplace_clicked',
        description: 'User clicked Expert Marketplace link',
        metadata: { source: 'verdict_banner' }
      }
    });
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
      <div className="flex items-center gap-3">
        <UserCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-sm text-foreground">Need a human expert?</h4>
          <p className="text-xs text-muted-foreground">Hire a vetted developer for complex issues</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a 
          href="https://www.toptal.com/developers" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
          onClick={handleExpertClick}
        >
          <Button size="sm" variant="outline">Find Expert</Button>
        </a>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
