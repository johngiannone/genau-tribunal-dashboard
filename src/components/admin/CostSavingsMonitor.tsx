import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingDown, DollarSign, Zap, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CostSavings {
  totalSavings: number;
  totalActualCost: number;
  totalHypotheticalCost: number;
  savingsPercentage: number;
  auditCount: number;
}

interface ProviderSavings {
  provider: string;
  savings: number;
  usageCount: number;
}

export function CostSavingsMonitor() {
  const [realtimeUpdate, setRealtimeUpdate] = useState(0);

  // Real-time subscription to activity_logs for audit events
  useEffect(() => {
    const channel = supabase
      .channel('cost-savings-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: 'activity_type=eq.audit_completed'
        },
        () => {
          console.log("New audit detected, refreshing savings data");
          setRealtimeUpdate(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch cost savings data
  const { data: savingsData, isLoading } = useQuery({
    queryKey: ['cost-savings', realtimeUpdate],
    queryFn: async () => {
      // Get all audits from the last 30 days with cost and provider metadata
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activityLogs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'audit_completed')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('estimated_cost', 'is', null)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Get all model pricing data
      const { data: modelPricing, error: pricingError } = await supabase
        .from('ai_models')
        .select('*');

      if (pricingError) throw pricingError;

      // Calculate savings for each audit
      let totalActualCost = 0;
      let totalHypotheticalCost = 0;
      const providerSavingsMap = new Map<string, { savings: number; count: number }>();
      const dailySavings: { date: string; savings: number; actualCost: number }[] = [];

      activityLogs?.forEach(log => {
        const actualCost = log.estimated_cost || 0;
        totalActualCost += actualCost;

        // Extract provider used from metadata
        const metadata = log.metadata as any;
        const primaryProvider = metadata?.primary_provider || 'openrouter';
        const modelId = metadata?.model_id;

        // Calculate hypothetical cost with fixed "openrouter" priority
        // (what it would have cost if we always used OpenRouter first)
        const openrouterPricing = modelPricing?.find(
          m => m.id === modelId && m.provider === 'openrouter'
        );
        
        // Estimate tokens (rough approximation: actual cost / actual provider rate)
        const actualProviderPricing = modelPricing?.find(
          m => m.id === modelId && m.provider === primaryProvider
        );
        
        let hypotheticalCost = actualCost;
        if (openrouterPricing && actualProviderPricing && actualProviderPricing.input_price > 0) {
          // Estimate total tokens used based on actual cost and actual provider pricing
          const estimatedTokens = (actualCost * 1_000_000) / 
            ((actualProviderPricing.input_price + actualProviderPricing.output_price) / 2);
          
          // Calculate what it would have cost on OpenRouter
          hypotheticalCost = (estimatedTokens * 
            ((openrouterPricing.input_price + openrouterPricing.output_price) / 2)) / 1_000_000;
        }

        totalHypotheticalCost += hypotheticalCost;
        const savings = hypotheticalCost - actualCost;

        // Track savings by provider
        const providerStats = providerSavingsMap.get(primaryProvider) || { savings: 0, count: 0 };
        providerStats.savings += savings;
        providerStats.count += 1;
        providerSavingsMap.set(primaryProvider, providerStats);

        // Track daily savings
        const date = new Date(log.created_at).toLocaleDateString();
        const existingDay = dailySavings.find(d => d.date === date);
        if (existingDay) {
          existingDay.savings += savings;
          existingDay.actualCost += actualCost;
        } else {
          dailySavings.push({ date, savings, actualCost });
        }
      });

      const totalSavings = totalHypotheticalCost - totalActualCost;
      const savingsPercentage = totalHypotheticalCost > 0 
        ? (totalSavings / totalHypotheticalCost) * 100 
        : 0;

      const providerSavings: ProviderSavings[] = Array.from(providerSavingsMap.entries()).map(
        ([provider, stats]) => ({
          provider,
          savings: stats.savings,
          usageCount: stats.count,
        })
      );

      return {
        summary: {
          totalSavings,
          totalActualCost,
          totalHypotheticalCost,
          savingsPercentage,
          auditCount: activityLogs?.length || 0,
        } as CostSavings,
        providerSavings,
        dailySavings: dailySavings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  const summary = savingsData?.summary;
  const providerSavings = savingsData?.providerSavings || [];
  const dailySavings = savingsData?.dailySavings || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Savings</p>
              <p className="text-3xl font-bold text-green-600">
                ${summary?.totalSavings.toFixed(2)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Last 30 days
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Savings Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {summary?.savingsPercentage.toFixed(1)}%
              </p>
            </div>
            <Award className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            vs. fixed priority
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Actual Cost</p>
              <p className="text-3xl font-bold text-purple-600">
                ${summary?.totalActualCost.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            With smart routing
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Audits Optimized</p>
              <p className="text-3xl font-bold text-orange-600">
                {summary?.auditCount}
              </p>
            </div>
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Intelligent routing
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Savings Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Cost Savings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySavings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(2)}`}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="savings" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Savings"
              />
              <Line 
                type="monotone" 
                dataKey="actualCost" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Actual Cost"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Provider Savings Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Savings by Provider</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={providerSavings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="provider" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(2)}`}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="savings" fill="#0ea5e9" name="Savings" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Provider Usage Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Provider Selection Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={providerSavings}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ provider, usageCount }) => `${provider}: ${usageCount}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="usageCount"
              >
                {providerSavings.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost Comparison */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cost Comparison</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="text-sm font-medium text-green-900">Intelligent Routing</p>
                <p className="text-2xl font-bold text-green-600">
                  ${summary?.totalActualCost.toFixed(2)}
                </p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
              <div>
                <p className="text-sm font-medium text-red-900">Fixed Priority (OpenRouter)</p>
                <p className="text-2xl font-bold text-red-600">
                  ${summary?.totalHypotheticalCost.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">You Saved</p>
              <p className="text-3xl font-bold text-blue-600">
                ${summary?.totalSavings.toFixed(2)}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {summary?.savingsPercentage.toFixed(1)}% reduction in costs
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
