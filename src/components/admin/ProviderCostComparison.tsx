import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ProviderStats {
  provider: string;
  totalCost: number;
  requestCount: number;
  avgCost: number;
  fallbackCount: number;
}

export function ProviderCostComparison() {
  const [stats, setStats] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderStats();
  }, []);

  const fetchProviderStats = async () => {
    try {
      // Fetch activity logs from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('estimated_cost, metadata, created_at')
        .eq('activity_type', 'audit_completed')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate stats by provider
      const providerMap = new Map<string, { totalCost: number; count: number; fallbacks: number }>();

      logs?.forEach(log => {
        const metadata = log.metadata as any;
        const cost = log.estimated_cost || 0;
        const providers = metadata?.providers_used || [metadata?.primary_provider || 'openrouter'];
        const fallbackUsed = metadata?.fallback_used || false;

        providers.forEach((provider: string) => {
          const existing = providerMap.get(provider) || { totalCost: 0, count: 0, fallbacks: 0 };
          existing.totalCost += cost / providers.length; // Split cost among providers
          existing.count += 1;
          if (fallbackUsed && provider !== metadata.primary_provider) {
            existing.fallbacks += 1;
          }
          providerMap.set(provider, existing);
        });
      });

      // Convert to array
      const statsArray: ProviderStats[] = Array.from(providerMap.entries()).map(([provider, data]) => ({
        provider: provider === 'openrouter' ? 'OpenRouter' : provider === 'together' ? 'Together AI' : provider,
        totalCost: data.totalCost,
        requestCount: data.count,
        avgCost: data.count > 0 ? data.totalCost / data.count : 0,
        fallbackCount: data.fallbacks
      }));

      setStats(statsArray.sort((a, b) => b.totalCost - a.totalCost));
    } catch (error) {
      console.error('Error fetching provider stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalCost = stats.reduce((sum, s) => sum + s.totalCost, 0);
  const totalRequests = stats.reduce((sum, s) => sum + s.requestCount, 0);
  const mostUsed = stats[0];
  const cheapest = [...stats].sort((a, b) => a.avgCost - b.avgCost)[0];

  const COLORS = ['#0071E3', '#00C7BE', '#5856D6', '#FF9500'];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalRequests} requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Most Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostUsed?.provider || 'N/A'}</div>
            <p className="text-xs text-muted-foreground mt-1">{mostUsed?.requestCount || 0} requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cheapest Avg</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cheapest?.provider || 'N/A'}</div>
            <p className="text-xs text-muted-foreground mt-1">${cheapest?.avgCost.toFixed(4) || 0}/req</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fallbacks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((sum, s) => sum + s.fallbackCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total failovers</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Total Cost by Provider</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="provider" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="totalCost" fill="#0071E3" name="Total Cost ($)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Request Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Request Distribution</CardTitle>
            <CardDescription>By provider (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats}
                    dataKey="requestCount"
                    nameKey="provider"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.provider}: ${entry.requestCount}`}
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Performance Comparison</CardTitle>
          <CardDescription>Cost efficiency and reliability metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Provider</th>
                  <th className="text-right py-3 px-4 font-semibold">Total Cost</th>
                  <th className="text-right py-3 px-4 font-semibold">Requests</th>
                  <th className="text-right py-3 px-4 font-semibold">Avg Cost/Req</th>
                  <th className="text-right py-3 px-4 font-semibold">Fallbacks</th>
                  <th className="text-right py-3 px-4 font-semibold">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, index) => {
                  const isCheapest = stat.avgCost === cheapest?.avgCost;
                  const isMostReliable = stat.fallbackCount === 0;
                  
                  return (
                    <tr key={stat.provider} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{stat.provider}</td>
                      <td className="py-3 px-4 text-right">${stat.totalCost.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">{stat.requestCount}</td>
                      <td className="py-3 px-4 text-right">
                        ${stat.avgCost.toFixed(4)}
                        {isCheapest && (
                          <TrendingDown className="inline-block ml-1 w-4 h-4 text-green-600" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {stat.fallbackCount}
                        {isMostReliable && stat.requestCount > 0 && (
                          <Activity className="inline-block ml-1 w-4 h-4 text-green-600" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isCheapest && isMostReliable && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Best Choice
                          </span>
                        )}
                        {isCheapest && !isMostReliable && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Most Economical
                          </span>
                        )}
                        {!isCheapest && isMostReliable && (
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Most Reliable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
