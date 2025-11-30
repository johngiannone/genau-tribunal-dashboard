import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";

export function SimpleCostForecastPanel() {
  const [currentSpend, setCurrentSpend] = useState(0);
  const [projectedMonthly, setProjectedMonthly] = useState(0);
  const [daysPassed, setDaysPassed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateForecast();
  }, []);

  const calculateForecast = async () => {
    setLoading(true);
    try {
      // Get start of current month and current date
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentDay = now.getDate();

      // Fetch activity logs with costs for current month
      const { data: activities, error } = await supabase
        .from('activity_logs')
        .select('estimated_cost')
        .gte('created_at', startOfMonth.toISOString())
        .eq('activity_type', 'audit_completed');

      if (error) throw error;

      // Calculate current spend
      const totalSpend = activities?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0;
      
      // Calculate daily average
      const dailyAverage = currentDay > 0 ? totalSpend / currentDay : 0;
      
      // Project for 30-day month
      const projected = dailyAverage * 30;

      setCurrentSpend(totalSpend);
      setProjectedMonthly(projected);
      setDaysPassed(currentDay);
    } catch (error) {
      console.error("Failed to calculate forecast:", error);
      toast.error("Failed to calculate cost forecast");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dailyRate = daysPassed > 0 ? currentSpend / daysPassed : 0;
  const remainingDays = 30 - daysPassed;
  const projectedRemaining = dailyRate * remainingDays;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0071E3]" />
              Simple Cost Forecast
            </CardTitle>
            <CardDescription>
              Projected monthly bill based on current usage
            </CardDescription>
          </div>
          <Button
            onClick={calculateForecast}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Projection */}
        <div className="text-center space-y-2 p-6 rounded-xl bg-gradient-to-br from-[#0071E3]/5 to-[#0071E3]/10 border border-[#0071E3]/20">
          <p className="text-sm text-muted-foreground font-medium">PROJECTED MONTHLY BILL</p>
          <p className="text-5xl font-bold text-[#0071E3]">
            ${projectedMonthly.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            Based on {daysPassed} days of data
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1 text-center p-4 rounded-lg bg-white border border-[#E5E5EA]">
            <p className="text-xs text-muted-foreground">Current Spend</p>
            <p className="text-2xl font-bold text-[#111111]">
              ${currentSpend.toFixed(4)}
            </p>
          </div>
          
          <div className="space-y-1 text-center p-4 rounded-lg bg-white border border-[#E5E5EA]">
            <p className="text-xs text-muted-foreground">Daily Average</p>
            <p className="text-2xl font-bold text-[#111111]">
              ${dailyRate.toFixed(4)}
            </p>
          </div>
          
          <div className="space-y-1 text-center p-4 rounded-lg bg-white border border-[#E5E5EA]">
            <p className="text-xs text-muted-foreground">Projected Remaining</p>
            <p className="text-2xl font-bold text-[#111111]">
              ${projectedRemaining.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Formula Explanation */}
        <div className="p-4 rounded-lg bg-[#F9FAFB] border border-[#E5E5EA]">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-[#86868B] mt-0.5" />
            <div className="text-sm text-[#86868B]">
              <p className="font-semibold mb-1">Calculation Method</p>
              <p>
                Projection = (Current Spend ÷ Days Passed) × 30 days
              </p>
              <p className="mt-2 text-xs">
                ({currentSpend.toFixed(4)} ÷ {daysPassed}) × 30 = ${projectedMonthly.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Month Progress</span>
            <span className="font-semibold">{((daysPassed / 30) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[#E5E5EA] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#0071E3] transition-all"
              style={{ width: `${(daysPassed / 30) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {remainingDays} days remaining in month
          </p>
        </div>
      </CardContent>
    </Card>
  );
}