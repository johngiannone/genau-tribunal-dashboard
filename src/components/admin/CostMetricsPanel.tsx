import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Percent, Activity as ActivityIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CostMetrics {
  totalSpendMonth: number;
  totalAuditsMonth: number;
  avgCostPerAudit: number;
  totalRevenue: number;
  profitMargin: number;
}

export function CostMetricsPanel() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCostMetrics();
  }, []);

  const fetchCostMetrics = async () => {
    setLoading(true);
    try {
      // Get start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch activity logs with costs for current month
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('estimated_cost, activity_type')
        .gte('created_at', startOfMonth.toISOString())
        .eq('activity_type', 'audit_completed');

      if (activitiesError) throw activitiesError;

      // Calculate total spend and audit count
      const totalSpendMonth = activities?.reduce((sum, log) => sum + (log.estimated_cost || 0), 0) || 0;
      const totalAuditsMonth = activities?.length || 0;
      const avgCostPerAudit = totalAuditsMonth > 0 ? totalSpendMonth / totalAuditsMonth : 0;

      // Fetch subscription revenue (from organization_billing credits added this month)
      const { data: billingTransactions, error: billingError } = await supabase
        .from('billing_transactions')
        .select('amount, transaction_type')
        .gte('created_at', startOfMonth.toISOString())
        .eq('transaction_type', 'credit_purchase');

      if (billingError) throw billingError;

      const totalRevenue = billingTransactions?.reduce((sum, txn) => sum + (txn.amount || 0), 0) || 0;

      // Calculate profit margin: (Revenue - Spend) / Revenue * 100
      const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalSpendMonth) / totalRevenue) * 100 : 0;

      setMetrics({
        totalSpendMonth,
        totalAuditsMonth,
        avgCostPerAudit,
        totalRevenue,
        profitMargin
      });
    } catch (error) {
      console.error("Failed to fetch cost metrics:", error);
      toast.error("Failed to load cost metrics");
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
            <div className="grid grid-cols-4 gap-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#0071E3]" />
              Cost Metrics (Current Month)
            </CardTitle>
            <CardDescription>
              Real-time spending and revenue analysis
            </CardDescription>
          </div>
          <Button
            onClick={fetchCostMetrics}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Spend */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Total Spend</span>
            </div>
            <div className="text-3xl font-bold text-[#111111]">
              ${metrics.totalSpendMonth.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </div>

          {/* Total Audits */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ActivityIcon className="w-4 h-4" />
              <span>Total Audits</span>
            </div>
            <div className="text-3xl font-bold text-[#111111]">
              {metrics.totalAuditsMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed
            </p>
          </div>

          {/* Avg Cost per Audit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Avg Cost/Audit</span>
            </div>
            <div className="text-3xl font-bold text-[#0071E3]">
              ${metrics.avgCostPerAudit.toFixed(6)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per execution
            </p>
          </div>

          {/* Total Revenue */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Revenue</span>
            </div>
            <div className="text-3xl font-bold text-green-600">
              ${metrics.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Credit purchases
            </p>
          </div>

          {/* Profit Margin */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="w-4 h-4" />
              <span>Profit Margin</span>
            </div>
            <div className={`text-3xl font-bold ${
              metrics.profitMargin >= 50 ? 'text-green-600' : 
              metrics.profitMargin >= 20 ? 'text-orange-600' : 
              'text-red-600'
            }`}>
              {metrics.profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.profitMargin >= 50 ? 'Healthy' : metrics.profitMargin >= 20 ? 'Moderate' : 'Low'}
            </p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mt-6 pt-6 border-t border-[#E5E5EA]">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Gross Profit</span>
              <span className="text-xl font-semibold">
                ${(metrics.totalRevenue - metrics.totalSpendMonth).toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Cost per Dollar Earned</span>
              <span className="text-xl font-semibold">
                ${metrics.totalRevenue > 0 ? (metrics.totalSpendMonth / metrics.totalRevenue).toFixed(4) : '0.0000'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground">Revenue per Audit</span>
              <span className="text-xl font-semibold">
                ${metrics.totalAuditsMonth > 0 ? (metrics.totalRevenue / metrics.totalAuditsMonth).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}