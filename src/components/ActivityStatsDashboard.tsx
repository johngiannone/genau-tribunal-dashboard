import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, TrendingUp, Clock, Users, Activity, CalendarIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface ActivityTypeCount {
  activity_type: string;
  count: number;
}

interface HourlyActivity {
  hour: number;
  count: number;
}

interface DailyActivity {
  date: string;
  login: number;
  logout: number;
  audit_completed: number;
  file_upload: number;
  profile_update: number;
  admin_change: number;
}

interface TopUser {
  user_id: string;
  count: number;
}

const COLORS = {
  login: '#10b981',
  logout: '#6b7280',
  audit_completed: '#3b82f6',
  file_upload: '#a855f7',
  profile_update: '#f59e0b',
  admin_change: '#ef4444',
};

export const ActivityStatsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activityTypeCounts, setActivityTypeCounts] = useState<ActivityTypeCount[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchStatistics();
    }
  }, [dateRange]);

  const fetchStatistics = async () => {
    if (!dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const fromDate = startOfDay(dateRange.from);
      const toDate = endOfDay(dateRange.to);

      // Fetch all activity logs within the date range
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('activity_type, created_at, user_id')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString());

      if (error) throw error;

      setTotalActivities(logs?.length || 0);

      // Process activity type counts
      const typeCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      const hourlyCounts: Record<number, number> = {};
      const dailyCounts: Record<string, Record<string, number>> = {};

      logs?.forEach((log) => {
        // Activity type counts
        typeCounts[log.activity_type] = (typeCounts[log.activity_type] || 0) + 1;

        // User counts
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;

        // Hourly counts
        const hour = new Date(log.created_at).getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;

        // Daily counts by type
        const date = format(new Date(log.created_at), 'MMM dd');
        if (!dailyCounts[date]) {
          dailyCounts[date] = {
            login: 0,
            logout: 0,
            audit_completed: 0,
            file_upload: 0,
            profile_update: 0,
            admin_change: 0,
          };
        }
        dailyCounts[date][log.activity_type] = (dailyCounts[date][log.activity_type] || 0) + 1;
      });

      // Convert to arrays
      const typeCountsArray = Object.entries(typeCounts).map(([activity_type, count]) => ({
        activity_type,
        count,
      }));

      const hourlyArray = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourlyCounts[i] || 0,
      }));

      const dailyArray: DailyActivity[] = Object.entries(dailyCounts).map(([date, counts]) => ({
        date,
        login: counts.login || 0,
        logout: counts.logout || 0,
        audit_completed: counts.audit_completed || 0,
        file_upload: counts.file_upload || 0,
        profile_update: counts.profile_update || 0,
        admin_change: counts.admin_change || 0,
      }));

      const topUsersArray = Object.entries(userCounts)
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setActivityTypeCounts(typeCountsArray);
      setHourlyActivity(hourlyArray);
      setDailyActivity(dailyArray);
      setTopUsers(topUsersArray);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const getDaysCount = () => {
    if (!dateRange?.from || !dateRange?.to) return 7;
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071E3]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-[#0071E3]" />
          <h2 className="text-2xl font-bold text-[#111111]">Activity Statistics</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {dateRange?.from && dateRange?.to
              ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
              : "Select date range"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Select Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(7)}
            className={cn(
              "h-9",
              getDaysCount() === 7 && "bg-[#0071E3] text-white hover:bg-[#0071E3]/90 hover:text-white"
            )}
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(30)}
            className={cn(
              "h-9",
              getDaysCount() === 30 && "bg-[#0071E3] text-white hover:bg-[#0071E3]/90 hover:text-white"
            )}
          >
            Last 30 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(90)}
            className={cn(
              "h-9",
              getDaysCount() === 90 && "bg-[#0071E3] text-white hover:bg-[#0071E3]/90 hover:text-white"
            )}
          >
            Last 90 days
          </Button>
          
          {/* Custom Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white z-50" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {/* Total Activities Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F9FAFB] border border-[#E5E5EA]">
            <Activity className="w-4 h-4 text-[#0071E3]" />
            <span className="text-lg font-bold text-[#111111]">{totalActivities}</span>
            <span className="text-xs text-[#86868B]">activities</span>
          </div>
        </div>
      </div>

      {/* Activity Types Distribution - Pie Chart */}
      <Card className="border-[#E5E5EA]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#111111]">
            Activity Types Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={activityTypeCounts}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ activity_type, percent }) => 
                  `${activity_type.replace('_', ' ')}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {activityTypeCounts.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.activity_type as keyof typeof COLORS] || '#6b7280'} 
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Activity Trends - Stacked Area Chart */}
      <Card className="border-[#E5E5EA]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[#111111]">
            Daily Activity Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#86868B', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#86868B', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E5E5EA',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="login" 
                stackId="1" 
                stroke={COLORS.login} 
                fill={COLORS.login} 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="logout" 
                stackId="1" 
                stroke={COLORS.logout} 
                fill={COLORS.logout} 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="audit_completed" 
                stackId="1" 
                stroke={COLORS.audit_completed} 
                fill={COLORS.audit_completed} 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="file_upload" 
                stackId="1" 
                stroke={COLORS.file_upload} 
                fill={COLORS.file_upload} 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="profile_update" 
                stackId="1" 
                stroke={COLORS.profile_update} 
                fill={COLORS.profile_update} 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="admin_change" 
                stackId="1" 
                stroke={COLORS.admin_change} 
                fill={COLORS.admin_change} 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Usage Hours - Bar Chart */}
        <Card className="border-[#E5E5EA]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0071E3]" />
              Peak Usage Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fill: '#86868B', fontSize: 12 }}
                  label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: '#86868B' }}
                />
                <YAxis tick={{ fill: '#86868B', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #E5E5EA',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(hour) => `${hour}:00`}
                />
                <Bar dataKey="count" fill="#0071E3" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Most Active Users - Leaderboard */}
        <Card className="border-[#E5E5EA]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0071E3]" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topUsers.length === 0 ? (
                <p className="text-sm text-[#86868B] text-center py-8">
                  No user activity data available
                </p>
              ) : (
                topUsers.map((user, index) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] hover:bg-white transition-all border border-[#E5E5EA]"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-[#FFD700] text-white' : 
                            index === 1 ? 'bg-[#C0C0C0] text-white' : 
                            index === 2 ? 'bg-[#CD7F32] text-white' : 
                            'bg-[#E5E5EA] text-[#86868B]'}
                        `}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-mono text-xs text-[#86868B]">
                          {user.user_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {user.count} activities
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
