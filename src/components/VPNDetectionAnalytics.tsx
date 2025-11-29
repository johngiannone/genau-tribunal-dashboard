import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Shield, Globe, TrendingUp, AlertTriangle } from "lucide-react";

interface CountryStats {
  country_code: string;
  count: number;
}

interface FraudScoreDistribution {
  range: string;
  count: number;
}

interface TrendData {
  date: string;
  count: number;
}

export const VPNDetectionAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [avgFraudScore, setAvgFraudScore] = useState(0);
  const [vpnCount, setVpnCount] = useState(0);
  const [proxyCount, setProxyCount] = useState(0);
  const [countryStats, setCountryStats] = useState<CountryStats[]>([]);
  const [fraudScoreDistribution, setFraudScoreDistribution] = useState<FraudScoreDistribution[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    
    // Fetch all blocked IPs
    const { data: blockedIPs, error } = await supabase
      .from("blocked_ips")
      .select("*")
      .order("blocked_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch blocked IPs:", error);
      setLoading(false);
      return;
    }

    if (!blockedIPs) {
      setLoading(false);
      return;
    }

    // Calculate total blocks
    setTotalBlocks(blockedIPs.length);

    // Calculate average fraud score
    const scoresWithValues = blockedIPs.filter(ip => ip.fraud_score !== null);
    if (scoresWithValues.length > 0) {
      const avgScore = scoresWithValues.reduce((sum, ip) => sum + (ip.fraud_score || 0), 0) / scoresWithValues.length;
      setAvgFraudScore(Math.round(avgScore));
    }

    // Count VPN and Proxy detections
    setVpnCount(blockedIPs.filter(ip => ip.is_vpn).length);
    setProxyCount(blockedIPs.filter(ip => ip.is_proxy).length);

    // Group by country
    const countryMap = new Map<string, number>();
    blockedIPs.forEach(ip => {
      const country = ip.country_code || "Unknown";
      countryMap.set(country, (countryMap.get(country) || 0) + 1);
    });
    const countryData = Array.from(countryMap.entries())
      .map(([country_code, count]) => ({ country_code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 countries
    setCountryStats(countryData);

    // Fraud score distribution
    const fraudRanges = [
      { min: 0, max: 25, label: "0-25" },
      { min: 26, max: 50, label: "26-50" },
      { min: 51, max: 75, label: "51-75" },
      { min: 76, max: 85, label: "76-85" },
      { min: 86, max: 100, label: "86-100" }
    ];
    const fraudDist = fraudRanges.map(range => ({
      range: range.label,
      count: scoresWithValues.filter(ip => 
        (ip.fraud_score || 0) >= range.min && (ip.fraud_score || 0) <= range.max
      ).length
    }));
    setFraudScoreDistribution(fraudDist);

    // Detection trends over last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const trendMap = new Map<string, number>();
    
    blockedIPs.forEach(ip => {
      const blockedDate = new Date(ip.blocked_at);
      if (blockedDate >= thirtyDaysAgo) {
        const dateKey = blockedDate.toISOString().split('T')[0];
        trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
      }
    });

    const trend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setTrendData(trend);

    setLoading(false);
  };

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            VPN/Proxy Detection Analytics
          </CardTitle>
          <CardDescription>Loading analytics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalBlocks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Fraud Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgFraudScore}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">VPN Detections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{vpnCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proxy Detections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{proxyCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocked Attempts by Country */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top 10 Countries
            </CardTitle>
            <CardDescription>Blocked attempts by country</CardDescription>
          </CardHeader>
          <CardContent>
            {countryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countryStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="country_code" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No country data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fraud Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Fraud Score Distribution
            </CardTitle>
            <CardDescription>Range of fraud scores detected</CardDescription>
          </CardHeader>
          <CardContent>
            {fraudScoreDistribution.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fraudScoreDistribution.filter(d => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {fraudScoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No fraud score data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detection Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detection Trends (Last 30 Days)
          </CardTitle>
          <CardDescription>Daily blocked IP detections</CardDescription>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  dot={{ fill: "#06b6d4", r: 4 }}
                  name="Blocked IPs"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No trend data available for the last 30 days
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
