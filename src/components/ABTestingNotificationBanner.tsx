import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, TrendingUp, X, Settings, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ABTestingNotificationBannerProps {
  performanceData: {
    recommended: { avgRating: number; count: number };
    user_configured: { avgRating: number; count: number };
  };
  onDismiss: () => void;
}

export function ABTestingNotificationBanner({ performanceData, onDismiss }: ABTestingNotificationBannerProps) {
  const navigate = useNavigate();
  const difference = performanceData.recommended.avgRating - performanceData.user_configured.avgRating;
  const improvement = ((difference / Math.abs(performanceData.user_configured.avgRating)) * 100).toFixed(0);

  return (
    <Card className="fixed bottom-6 right-6 max-w-md z-50 border-2 border-primary shadow-2xl bg-card/95 backdrop-blur">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <AlertTitle className="text-base font-semibold mb-0">
              Performance Insight
            </AlertTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <AlertDescription className="space-y-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Based on <strong>{performanceData.recommended.count + performanceData.user_configured.count} audits</strong>, 
              AI-recommended councils are delivering <strong className="text-primary">{improvement}% better results</strong> than 
              your manual configuration.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 p-3 rounded-lg">
            <div>
              <div className="text-muted-foreground mb-1">AI Recommended</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">
                  {performanceData.recommended.avgRating > 0 ? '+' : ''}{performanceData.recommended.avgRating}
                </span>
                <span className="text-muted-foreground">avg</span>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Your Config</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {performanceData.user_configured.avgRating > 0 ? '+' : ''}{performanceData.user_configured.avgRating}
                </span>
                <span className="text-muted-foreground">avg</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Consider enabling automatic model recommendations in Settings to consistently get better results.
          </p>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => navigate("/settings")}
              className="flex-1 gap-2"
            >
              <Settings className="w-4 h-4" />
              Enable Auto-Recommendations
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/vault")}
              className="flex-1 gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              View Details
            </Button>
          </div>
        </AlertDescription>
      </div>
    </Card>
  );
}
