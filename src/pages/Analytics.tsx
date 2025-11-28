import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, Zap, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsEvent {
  model_id: string;
  model_name: string;
  model_role: string | null;
  latency_ms: number;
  created_at: string;
}

interface ModelStats {
  name: string;
  model: string;
  avgLatency: number;
  queriesHandled: number;
  status: string;
}

const Analytics = () => {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching analytics:", error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  // Aggregate data by model
  const modelStats: ModelStats[] = Object.values(
    events.reduce((acc, event) => {
      const key = event.model_id;
      if (!acc[key]) {
        acc[key] = {
          name: event.model_role || event.model_name,
          model: event.model_name,
          avgLatency: 0,
          queriesHandled: 0,
          totalLatency: 0,
          status: "online"
        };
      }
      acc[key].queriesHandled++;
      acc[key].totalLatency += event.latency_ms;
      acc[key].avgLatency = Math.round(acc[key].totalLatency / acc[key].queriesHandled);
      return acc;
    }, {} as Record<string, any>)
  );

  const totalAudits = Math.floor(events.length / 3); // Each audit uses 3 models
  const fastestAgent = modelStats.length > 0 
    ? modelStats.reduce((fastest, current) => 
        current.avgLatency < fastest.avgLatency ? current : fastest
      )
    : null;

  const responseTimeData = modelStats.map(m => ({
    name: m.model,
    latency: m.avgLatency
  }));

  const accuracyData = modelStats.map((m, idx) => ({
    name: m.model,
    value: m.queriesHandled,
    fill: `hsl(var(--chart-${(idx % 5) + 1}))`
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground font-mono tracking-tight">
            Council Performance Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Real-time analytics and agent metrics
          </p>
        </div>

        {/* Top Row - KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Audits</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-mono">{totalAudits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total consensus audits completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Models Active</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-mono">{modelStats.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Unique models used</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Fastest Agent</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {fastestAgent ? (
                <>
                  <div className="text-3xl font-bold text-primary font-mono">{fastestAgent.model}</div>
                  <p className="text-xs text-muted-foreground mt-1">{fastestAgent.avgLatency}ms average</p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Response Time Bar Chart */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-mono text-card-foreground">Response Time by Agent</CardTitle>
              <CardDescription className="font-mono">Average latency in milliseconds</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  latency: {
                    label: "Latency (ms)",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseTimeData}>
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}ms`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
                      {responseTimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Accuracy Donut Chart */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-mono text-card-foreground">Accuracy Win Share</CardTitle>
              <CardDescription className="font-mono">Draft selection frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: {
                    label: "Win Share",
                  },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accuracyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {accuracyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="flex flex-col">
                                 <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {payload[0].name}
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {payload[0].value} queries
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Agent Table */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-mono text-card-foreground">Agent Performance Details</CardTitle>
            <CardDescription className="font-mono">Comprehensive metrics for each council member</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">Agent</TableHead>
                  <TableHead className="font-mono">Model</TableHead>
                  <TableHead className="font-mono text-right">Avg Latency</TableHead>
                  <TableHead className="font-mono text-right">Queries</TableHead>
                  <TableHead className="font-mono">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No analytics data yet. Complete some audits to see performance metrics.
                    </TableCell>
                  </TableRow>
                ) : (
                  modelStats.map((member) => (
                    <TableRow key={member.model}>
                      <TableCell className="font-medium font-mono">{member.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{member.model}</TableCell>
                      <TableCell className="text-right font-mono">{member.avgLatency}ms</TableCell>
                      <TableCell className="text-right font-mono">{member.queriesHandled}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/30 font-mono"
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
