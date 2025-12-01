import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Award, Sparkles, User, Target } from "lucide-react";

interface TrainingData {
  id: string;
  council_source: string | null;
  human_rating: number;
  created_at: string;
}

interface ABTestingAnalyticsProps {
  trainingData: TrainingData[];
}

interface ABStats {
  source: string;
  count: number;
  avgRating: number;
  goodCount: number;
  badCount: number;
  unratedCount: number;
  acceptanceRate: number;
}

const COLORS = {
  recommended: "#06b6d4",
  user_configured: "#FFD700",
  default: "#86868B"
};

export function ABTestingAnalytics({ trainingData }: ABTestingAnalyticsProps) {
  
  const calculateABStats = (): ABStats[] => {
    const grouped = trainingData.reduce((acc, item) => {
      const source = item.council_source || 'default';
      if (!acc[source]) {
        acc[source] = {
          total: 0,
          ratingSum: 0,
          good: 0,
          bad: 0,
          unrated: 0
        };
      }
      
      acc[source].total += 1;
      if (item.human_rating === 1) {
        acc[source].good += 1;
        acc[source].ratingSum += 1;
      } else if (item.human_rating === -1) {
        acc[source].bad += 1;
        acc[source].ratingSum -= 1;
      } else {
        acc[source].unrated += 1;
      }
      
      return acc;
    }, {} as Record<string, { total: number; ratingSum: number; good: number; bad: number; unrated: number }>);

    return Object.entries(grouped).map(([source, stats]) => {
      const ratedCount = stats.good + stats.bad;
      const avgRating = ratedCount > 0 ? stats.ratingSum / ratedCount : 0;
      const acceptanceRate = stats.total > 0 ? (stats.good / stats.total) * 100 : 0;
      
      // Ensure avgRating is a valid finite number
      const safeAvgRating = Number.isFinite(avgRating) ? Number(avgRating.toFixed(2)) : 0;
      const safeAcceptanceRate = Number.isFinite(acceptanceRate) ? Number(acceptanceRate.toFixed(1)) : 0;
      
      return {
        source: source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: stats.total,
        avgRating: safeAvgRating,
        goodCount: stats.good,
        badCount: stats.bad,
        unratedCount: stats.unrated,
        acceptanceRate: safeAcceptanceRate
      };
    })
    .filter(item => Number.isFinite(item.avgRating)) // Filter out invalid entries
    .sort((a, b) => b.avgRating - a.avgRating);
  };

  const calculateUsageDistribution = () => {
    const distribution = trainingData.reduce((acc, item) => {
      const source = item.council_source || 'default';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([source, count]) => ({
      name: source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      percentage: ((count / trainingData.length) * 100).toFixed(1)
    }));
  };

  const abStats = calculateABStats();
  const usageDistribution = calculateUsageDistribution();

  const getIcon = (source: string) => {
    if (source.toLowerCase().includes('recommended')) return <Sparkles className="w-4 h-4" />;
    if (source.toLowerCase().includes('configured')) return <User className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  const getColor = (source: string) => {
    if (source.toLowerCase().includes('recommended')) return COLORS.recommended;
    if (source.toLowerCase().includes('configured')) return COLORS.user_configured;
    return COLORS.default;
  };

  const winnerSource = abStats.length > 0 ? abStats[0] : null;
  const hasMultipleSources = abStats.length > 1;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {abStats.map((stat, idx) => (
          <Card key={stat.source} className={idx === 0 && hasMultipleSources ? "border-2 border-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(stat.source)}
                  <CardTitle className="text-sm font-medium">{stat.source}</CardTitle>
                </div>
                {idx === 0 && hasMultipleSources && (
                  <Badge variant="default" className="bg-primary">
                    <Award className="w-3 h-3 mr-1" />
                    Winner
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: getColor(stat.source) }}>
                    {stat.avgRating > 0 ? '+' : ''}{stat.avgRating}
                  </span>
                  <span className="text-sm text-muted-foreground">avg rating</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-green-600 font-semibold">↑ {stat.goodCount}</div>
                    <div className="text-muted-foreground">Good</div>
                  </div>
                  <div>
                    <div className="text-red-600 font-semibold">↓ {stat.badCount}</div>
                    <div className="text-muted-foreground">Bad</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-semibold">— {stat.unratedCount}</div>
                    <div className="text-muted-foreground">Unrated</div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Acceptance Rate</span>
                    <span className="font-semibold">{stat.acceptanceRate}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Rating Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Average Rating by Council Source
            </CardTitle>
            <CardDescription>
              Higher ratings indicate better verdict quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            {abStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={abStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[-1, 1]} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="source" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value > 0 ? '+' : ''}${value}`, 'Avg Rating']}
                  />
                  <Bar dataKey="avgRating" radius={[0, 8, 8, 0]}>
                    {abStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColor(entry.source)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Council Source Distribution
            </CardTitle>
            <CardDescription>
              How often each council type is used
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={usageDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No distribution data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed A/B Testing Results</CardTitle>
          <CardDescription>
            Complete breakdown of performance metrics by council source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Council Source</th>
                  <th className="text-right py-3 px-4 font-medium">Total Audits</th>
                  <th className="text-right py-3 px-4 font-medium">Avg Rating</th>
                  <th className="text-right py-3 px-4 font-medium">Good</th>
                  <th className="text-right py-3 px-4 font-medium">Bad</th>
                  <th className="text-right py-3 px-4 font-medium">Unrated</th>
                  <th className="text-right py-3 px-4 font-medium">Acceptance</th>
                </tr>
              </thead>
              <tbody>
                {abStats.map((stat, idx) => (
                  <tr key={stat.source} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getIcon(stat.source)}
                        <span className="font-medium">{stat.source}</span>
                        {idx === 0 && hasMultipleSources && (
                          <Badge variant="outline" className="ml-2">Best</Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">{stat.count}</td>
                    <td className="text-right py-3 px-4">
                      <span className="font-semibold" style={{ color: getColor(stat.source) }}>
                        {stat.avgRating > 0 ? '+' : ''}{stat.avgRating}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-green-600">{stat.goodCount}</td>
                    <td className="text-right py-3 px-4 text-red-600">{stat.badCount}</td>
                    <td className="text-right py-3 px-4 text-muted-foreground">{stat.unratedCount}</td>
                    <td className="text-right py-3 px-4 font-medium">{stat.acceptanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      {winnerSource && hasMultipleSources && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Key Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong style={{ color: getColor(winnerSource.source) }}>{winnerSource.source}</strong> councils 
              achieve the highest average rating of <strong>{winnerSource.avgRating > 0 ? '+' : ''}{winnerSource.avgRating}</strong> with 
              a <strong>{winnerSource.acceptanceRate}%</strong> acceptance rate across {winnerSource.count} audits.
              {winnerSource.source.toLowerCase().includes('recommended') && 
                " AI recommendations are delivering superior results compared to manual configuration."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
