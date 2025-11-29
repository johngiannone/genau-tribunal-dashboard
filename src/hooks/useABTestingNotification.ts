import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ABPerformanceData {
  recommended: { avgRating: number; count: number };
  user_configured: { avgRating: number; count: number };
}

const NOTIFICATION_KEY = "ab_testing_notification_dismissed";
const MIN_AUDITS_THRESHOLD = 10; // Need at least 10 audits of each type
const PERFORMANCE_MARGIN = 0.3; // AI needs to be 0.3 points better

export function useABTestingNotification(session: any) {
  const [showNotification, setShowNotification] = useState(false);
  const [performanceData, setPerformanceData] = useState<ABPerformanceData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!session?.user) return;

    // Check if notification was already dismissed
    const dismissed = localStorage.getItem(NOTIFICATION_KEY);
    if (dismissed === "true") return;

    checkABPerformance();
  }, [session]);

  const checkABPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from("training_dataset")
        .select("council_source, human_rating")
        .not("council_source", "is", null)
        .not("human_rating", "is", null);

      if (error || !data) {
        console.error("Error fetching A/B data:", error);
        return;
      }

      // Calculate performance metrics
      const metrics = data.reduce((acc, item) => {
        const source = item.council_source as string;
        if (!acc[source]) {
          acc[source] = { total: 0, sum: 0, count: 0 };
        }
        acc[source].total += 1;
        if (item.human_rating !== 0) {
          acc[source].sum += item.human_rating;
          acc[source].count += 1;
        }
        return acc;
      }, {} as Record<string, { total: number; sum: number; count: number }>);

      const recommended = metrics.recommended || { total: 0, sum: 0, count: 0 };
      const userConfigured = metrics.user_configured || { total: 0, sum: 0, count: 0 };

      // Need minimum audits to make a determination
      if (recommended.count < MIN_AUDITS_THRESHOLD || userConfigured.count < MIN_AUDITS_THRESHOLD) {
        return;
      }

      const recommendedAvg = recommended.sum / recommended.count;
      const userConfiguredAvg = userConfigured.sum / userConfigured.count;
      const difference = recommendedAvg - userConfiguredAvg;

      // Check if AI recommendations significantly outperform
      if (difference >= PERFORMANCE_MARGIN) {
        setPerformanceData({
          recommended: { avgRating: Number(recommendedAvg.toFixed(2)), count: recommended.count },
          user_configured: { avgRating: Number(userConfiguredAvg.toFixed(2)), count: userConfigured.count }
        });
        setShowNotification(true);

        // Also show a toast for immediate feedback
        toast({
          title: "💡 Performance Insight Available",
          description: "AI recommendations are delivering better results. Check the notification for details.",
          duration: 8000,
        });
      }
    } catch (err) {
      console.error("Error checking A/B performance:", err);
    }
  };

  const dismissNotification = () => {
    localStorage.setItem(NOTIFICATION_KEY, "true");
    setShowNotification(false);
  };

  const clearDismissal = () => {
    localStorage.removeItem(NOTIFICATION_KEY);
    setShowNotification(false);
  };

  return {
    showNotification,
    performanceData,
    dismissNotification,
    clearDismissal,
  };
}
