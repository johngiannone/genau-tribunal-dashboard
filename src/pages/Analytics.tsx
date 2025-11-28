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

// Mock data for council members
const councilMembers = [
  { name: "The Chairman", model: "GPT-4o", avgLatency: 850, consensusRate: 92, queriesHandled: 487, satisfaction: 4.8, status: "online" },
  { name: "The Critic", model: "Claude 3.5", avgLatency: 720, consensusRate: 89, queriesHandled: 445, satisfaction: 4.6, status: "online" },
  { name: "The Architect", model: "Qwen 2.5", avgLatency: 650, consensusRate: 85, queriesHandled: 412, satisfaction: 4.4, status: "online" },
  { name: "The Reporter", model: "Grok 2", avgLatency: 580, consensusRate: 88, queriesHandled: 398, satisfaction: 4.5, status: "online" },
  { name: "The Speedster", model: "Llama 3", avgLatency: 410, consensusRate: 84, queriesHandled: 498, satisfaction: 4.7, status: "online" },
];

const responseTimeData = councilMembers.map(m => ({
  name: m.model,
  latency: m.avgLatency
}));

const accuracyData = [
  { name: "GPT-4o", value: 30, fill: "hsl(var(--chart-1))" },
  { name: "Claude 3.5", value: 25, fill: "hsl(var(--chart-2))" },
  { name: "Qwen 2.5", value: 18, fill: "hsl(var(--chart-3))" },
  { name: "Grok 2", value: 15, fill: "hsl(var(--chart-4))" },
  { name: "Llama 3", value: 12, fill: "hsl(var(--chart-5))" },
];

const Analytics = () => {
  const totalAudits = councilMembers.reduce((sum, m) => sum + m.queriesHandled, 0);
  const avgConsensusRate = Math.round(
    councilMembers.reduce((sum, m) => sum + m.consensusRate, 0) / councilMembers.length
  );
  const fastestAgent = councilMembers.reduce((fastest, current) =>
    current.avgLatency < fastest.avgLatency ? current : fastest
  );

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
                <TrendingUp className="inline h-3 w-3 mr-1" />
                +12% from last period
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Consensus Rate</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-mono">{avgConsensusRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Average across all agents</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Fastest Agent</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary font-mono">{fastestAgent.model}</div>
              <p className="text-xs text-muted-foreground mt-1">{fastestAgent.avgLatency}ms average</p>
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
                                  {payload[0].value}%
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
                  <TableHead className="font-mono text-right">Consensus Rate</TableHead>
                  <TableHead className="font-mono text-right">Queries</TableHead>
                  <TableHead className="font-mono text-right">Satisfaction</TableHead>
                  <TableHead className="font-mono">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {councilMembers.map((member) => (
                  <TableRow key={member.name}>
                    <TableCell className="font-medium font-mono">{member.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{member.model}</TableCell>
                    <TableCell className="text-right font-mono">{member.avgLatency}ms</TableCell>
                    <TableCell className="text-right font-mono">{member.consensusRate}%</TableCell>
                    <TableCell className="text-right font-mono">{member.queriesHandled}</TableCell>
                    <TableCell className="text-right font-mono">⭐ {member.satisfaction}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 font-mono"
                      >
                        Online
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
