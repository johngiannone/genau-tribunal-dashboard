import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface FeatureUsageData {
  feature: string;
  count: number;
  percentage: number;
}

const COLORS = ['#0071E3', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#00C7BE', '#FF2D55'];

export function FeatureUsageHeatmap() {
  const [featureData, setFeatureData] = useState<FeatureUsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActivities, setTotalActivities] = useState(0);

  useEffect(() => {
    fetchFeatureUsage();
  }, []);

  const fetchFeatureUsage = async () => {
    try {
      setLoading(true);

      // Fetch all activity logs
      const { data: activities, error } = await supabase
        .from('activity_logs')
        .select('activity_type')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Count occurrences of each activity type
      const activityCounts = new Map<string, number>();
      activities?.forEach(activity => {
        const count = activityCounts.get(activity.activity_type) || 0;
        activityCounts.set(activity.activity_type, count + 1);
      });

      const total = activities?.length || 0;
      setTotalActivities(total);

      // Convert to array and calculate percentages
      const featureUsage: FeatureUsageData[] = [];
      activityCounts.forEach((count, feature) => {
        featureUsage.push({
          feature: formatFeatureName(feature),
          count,
          percentage: Math.round((count / total) * 100),
        });
      });

      // Sort by count (highest first)
      featureUsage.sort((a, b) => b.count - a.count);
      setFeatureData(featureUsage);

    } catch (error) {
      console.error('Error fetching feature usage:', error);
      toast.error('Failed to load feature usage data');
    } finally {
      setLoading(false);
    }
  };

  const formatFeatureName = (activityType: string): string => {
    return activityType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-[#E5E5EA] rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].payload.feature}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} activities ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading feature usage data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Feature Usage Summary
          </CardTitle>
          <CardDescription>
            Total tracked activities: <strong>{totalActivities.toLocaleString()}</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Feature Usage Distribution
          </CardTitle>
          <CardDescription>
            Activity frequency by feature type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={featureData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="feature" 
                angle={-45}
                textAnchor="end"
                height={120}
                style={{ fontSize: '12px' }}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {featureData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Features by Percentage</CardTitle>
          <CardDescription>
            Relative usage distribution of top 8 features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={featureData.slice(0, 8)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ feature, percentage }) => `${feature}: ${percentage}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {featureData.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {featureData.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F7] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="font-medium">{feature.feature}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-2xl font-bold text-[#1D1D1F]">
                    {feature.count.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {feature.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
