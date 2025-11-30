import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Trophy, Zap, DollarSign, Activity, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { RoutingStrategyId, StrategyPerformanceMetrics } from "@/types/routing";
import { ROUTING_STRATEGIES } from "@/lib/routingStrategies";

export function ABTestingRoutingDashboard() {
  const [realtimeUpdate, setRealtimeUpdate] = useState(0);

  // Real-time subscription to activity_logs
  useEffect(() => {
    const channel = supabase
      .channel('ab-testing-routing')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: 'activity_type=eq.audit_completed'
        },
        () => {
          console.log("New audit detected, refreshing A/B test data");
          setRealtimeUpdate(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch A/B testing performance metrics
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['routing-ab-test', realtimeUpdate],
    queryFn: async () => {
      // Get active experiment
      const { data: experiments } = await supabase
        .from('routing_experiments')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!experiments) {
        return { experiment: null, metrics: [], comparison: [] };
      }

      // Get activity logs from experiment start date with routing strategy metadata
      const { data: activityLogs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'audit_completed')
        .gte('created_at', experiments.start_date)
        .not('metadata', 'is', null)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      // Aggregate metrics by routing strategy
      const strategyStats = new Map<string, {
        totalAudits: number;
        totalCost: number;
        totalLatency: number;
        errorCount: number;
        ratings: number[];
      }>();

      // Filter logs that have routing_strategy in metadata
      const relevantLogs = activityLogs?.filter(log => {
        const metadata = log.metadata as any;
        return metadata?.routing_strategy;
      }) || [];

      relevantLogs.forEach(log => {
        const metadata = log.metadata as any;
        const strategy = metadata.routing_strategy || 'pure_cost';
        const cost = log.estimated_cost || 0;
        const latency = metadata.avg_latency || 0;
        const hasError = metadata.fallback_used === true;

        if (!strategyStats.has(strategy)) {
          strategyStats.set(strategy, {
            totalAudits: 0,
            totalCost: 0,
            totalLatency: 0,
            errorCount: 0,
            ratings: []
          });
        }

        const stats = strategyStats.get(strategy)!;
        stats.totalAudits += 1;
        stats.totalCost += cost;
        stats.totalLatency += latency;
        stats.errorCount += hasError ? 1 : 0;
      });

      // Calculate performance metrics for each strategy
      const metrics: StrategyPerformanceMetrics[] = Array.from(strategyStats.entries()).map(
        ([strategyId, stats]) => {
          const avgCost = stats.totalAudits > 0 ? stats.totalCost / stats.totalAudits : 0;
          const avgLatency = stats.totalAudits > 0 ? stats.totalLatency / stats.totalAudits : 0;
          const errorRate = stats.totalAudits > 0 ? (stats.errorCount / stats.totalAudits) * 100 : 0;
          const avgRating = stats.ratings.length > 0 
            ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length 
            : 0;

          return {
            strategy: strategyId as RoutingStrategyId,
            totalAudits: stats.totalAudits,
            avgCost,
            avgLatency,
            errorRate,
            userSatisfaction: avgRating,
            totalCost: stats.totalCost
          };
        }
      );

      // Calculate comparison data (normalize to pure_cost baseline)
      const pureCostMetrics = metrics.find(m => m.strategy === 'pure_cost');
      const comparison = metrics.map(metric => {
        if (!pureCostMetrics || pureCostMetrics.totalAudits === 0) {
          return {
            strategy: metric.strategy,
            costDiff: 0,
            latencyDiff: 0,
            reliabilityDiff: 0
          };
        }

        const costDiff = ((metric.avgCost - pureCostMetrics.avgCost) / pureCostMetrics.avgCost) * 100;
        const latencyDiff = ((metric.avgLatency - pureCostMetrics.avgLatency) / pureCostMetrics.avgLatency) * 100;
        const reliabilityDiff = pureCostMetrics.errorRate - metric.errorRate; // Lower error rate is better

        return {
          strategy: metric.strategy,
          costDiff: Number.isFinite(costDiff) ? costDiff : 0,
          latencyDiff: Number.isFinite(latencyDiff) ? latencyDiff : 0,
          reliabilityDiff: Number.isFinite(reliabilityDiff) ? reliabilityDiff : 0
        };
      });

      return {
        experiment: experiments,
        metrics: metrics.sort((a, b) => b.totalAudits - a.totalAudits),
        comparison
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

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

  const experiment = metricsData?.experiment;
  const metrics = metricsData?.metrics || [];
  const comparison = metricsData?.comparison || [];

  if (!experiment) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p className="text-lg font-semibold">No Active A/B Test</p>
          <p className="text-sm mt-2">Start an experiment to compare routing strategies</p>
        </div>
      </Card>
    );
  }

  // Determine winner (lowest cost + latency combined score)
  const winner = metrics.reduce((best, curr) => {
    const bestScore = (best.avgCost * 0.7) + (best.avgLatency * 0.3);
    const currScore = (curr.avgCost * 0.7) + (curr.avgLatency * 0.3);
    return currScore < bestScore ? curr : best;
  }, metrics[0]);

  const strategyColors: Record<RoutingStrategyId, string> = {
    pure_cost: '#0ea5e9',
    latency_weighted: '#8b5cf6',
    reliability_weighted: '#10b981'
  };

  return (
    <div className="space-y-6">
      {/* Experiment Header */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{experiment.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{experiment.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <Badge variant="default" className="bg-green-600">
                Active
              </Badge>
              <span className="text-xs text-muted-foreground">
                Started: {new Date(experiment.start_date).toLocaleDateString()}
              </span>
              <span className="text-xs text-muted-foreground">
                Total Audits: {metrics.reduce((sum, m) => sum + m.totalAudits, 0)}
              </span>
            </div>
          </div>
          {winner && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-4 shadow-md">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Current Leader</p>
                <p className="text-lg font-bold text-gray-900">
                  {ROUTING_STRATEGIES[winner.strategy].name}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map(metric => (
          <Card key={metric.strategy} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {ROUTING_STRATEGIES[metric.strategy].name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.totalAudits} audits
                </p>
              </div>
              {winner?.strategy === metric.strategy && (
                <Trophy className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Avg Cost
                </span>
                <span className="text-sm font-semibold">${metric.avgCost.toFixed(4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Avg Latency
                </span>
                <span className="text-sm font-semibold">{metric.avgLatency.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Error Rate
                </span>
                <span className="text-sm font-semibold">{metric.errorRate.toFixed(1)}%</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost vs Latency */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cost vs Latency Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="strategy" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => ROUTING_STRATEGIES[value as RoutingStrategyId].name.split(' ')[0]}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'avgCost') return [`$${value.toFixed(4)}`, 'Avg Cost'];
                  return [`${value.toFixed(0)}ms`, 'Avg Latency'];
                }}
                labelFormatter={(value) => ROUTING_STRATEGIES[value as RoutingStrategyId].name}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="avgCost" fill="#0ea5e9" name="Avg Cost ($)" />
              <Bar yAxisId="right" dataKey="avgLatency" fill="#8b5cf6" name="Avg Latency (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Performance Radar */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={comparison}>
              <PolarGrid />
              <PolarAngleAxis dataKey="strategy" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis />
              <Tooltip />
              <Radar 
                name="Cost Diff %" 
                dataKey="costDiff" 
                stroke="#0ea5e9" 
                fill="#0ea5e9" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="Latency Diff %" 
                dataKey="latencyDiff" 
                stroke="#8b5cf6" 
                fill="#8b5cf6" 
                fillOpacity={0.3} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Total Cost by Strategy */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Total Cost by Strategy</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="strategy" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => ROUTING_STRATEGIES[value as RoutingStrategyId].name.split(' ')[0]}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(2)}`}
                labelFormatter={(value) => ROUTING_STRATEGIES[value as RoutingStrategyId].name}
              />
              <Bar dataKey="totalCost" fill="#10b981" name="Total Cost" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Error Rate Comparison */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Reliability Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="strategy" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => ROUTING_STRATEGIES[value as RoutingStrategyId].name.split(' ')[0]}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(2)}%`}
                labelFormatter={(value) => ROUTING_STRATEGIES[value as RoutingStrategyId].name}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="errorRate" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Error Rate %"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Strategy</th>
                <th className="text-right p-3">Total Audits</th>
                <th className="text-right p-3">Avg Cost</th>
                <th className="text-right p-3">Total Cost</th>
                <th className="text-right p-3">Avg Latency</th>
                <th className="text-right p-3">Error Rate</th>
                <th className="text-center p-3">Winner</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(metric => (
                <tr key={metric.strategy} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">
                    {ROUTING_STRATEGIES[metric.strategy].name}
                  </td>
                  <td className="text-right p-3">{metric.totalAudits}</td>
                  <td className="text-right p-3">${metric.avgCost.toFixed(4)}</td>
                  <td className="text-right p-3 font-semibold">${metric.totalCost.toFixed(2)}</td>
                  <td className="text-right p-3">{metric.avgLatency.toFixed(0)}ms</td>
                  <td className="text-right p-3">
                    <span className={metric.errorRate > 5 ? 'text-red-600 font-semibold' : ''}>
                      {metric.errorRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center p-3">
                    {winner?.strategy === metric.strategy && (
                      <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
