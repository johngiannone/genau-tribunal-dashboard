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
import { Loader2, TrendingUp, Clock, Users, Activity, CalendarIcon, Download, GitCompare, ArrowUp, ArrowDown, Minus } from "lucide-react";
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
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ActivityHeatmap } from "./ActivityHeatmap";

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
  const [exporting, setExporting] = useState(false);
  const [activityTypeCounts, setActivityTypeCounts] = useState<ActivityTypeCount[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<HourlyActivity[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 14),
    to: subDays(new Date(), 7),
  });
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonActivityTypeCounts, setComparisonActivityTypeCounts] = useState<ActivityTypeCount[]>([]);
  const [comparisonHourlyActivity, setComparisonHourlyActivity] = useState<HourlyActivity[]>([]);
  const [comparisonDailyActivity, setComparisonDailyActivity] = useState<DailyActivity[]>([]);
  const [comparisonTopUsers, setComparisonTopUsers] = useState<TopUser[]>([]);
  const [comparisonTotalActivities, setComparisonTotalActivities] = useState(0);
  
  // Raw logs for heatmap
  const [rawLogs, setRawLogs] = useState<{ created_at: string }[]>([]);
  const [comparisonRawLogs, setComparisonRawLogs] = useState<{ created_at: string }[]>([]);

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchStatistics();
    }
  }, [dateRange]);

  useEffect(() => {
    if (comparisonMode && comparisonDateRange?.from && comparisonDateRange?.to) {
      fetchComparisonStatistics();
    }
  }, [comparisonMode, comparisonDateRange]);

  // Set up realtime subscription for new activities
  useEffect(() => {
    const channel = supabase
      .channel('stats-activity-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('New activity received in stats dashboard:', payload);
          
          const newActivity = payload.new as any;
          
          // Check if the new activity is within the current date range
          if (dateRange?.from && dateRange?.to) {
            const activityDate = new Date(newActivity.created_at);
            const fromDate = startOfDay(dateRange.from);
            const toDate = endOfDay(dateRange.to);
            
            if (activityDate >= fromDate && activityDate <= toDate) {
              // Update statistics incrementally
              setTotalActivities(prev => prev + 1);
              
              // Update activity type counts
              setActivityTypeCounts(prev => {
                const existing = prev.find(item => item.activity_type === newActivity.activity_type);
                if (existing) {
                  return prev.map(item => 
                    item.activity_type === newActivity.activity_type
                      ? { ...item, count: item.count + 1 }
                      : item
                  );
                } else {
                  return [...prev, { activity_type: newActivity.activity_type, count: 1 }];
                }
              });
              
              // Update hourly activity
              const hour = new Date(newActivity.created_at).getHours();
              setHourlyActivity(prev => 
                prev.map(item => 
                  item.hour === hour 
                    ? { ...item, count: item.count + 1 }
                    : item
                )
              );
              
              // Update daily activity
              const date = format(new Date(newActivity.created_at), 'MMM dd');
              setDailyActivity(prev => {
                const existing = prev.find(item => item.date === date);
                if (existing) {
                  return prev.map(item => {
                    if (item.date === date) {
                      const updated = { ...item };
                      const activityType = newActivity.activity_type as keyof Omit<DailyActivity, 'date'>;
                      if (activityType in updated) {
                        updated[activityType] = (updated[activityType] as number) + 1;
                      }
                      return updated;
                    }
                    return item;
                  });
                } else {
                  const newEntry: DailyActivity = {
                    date,
                    login: 0,
                    logout: 0,
                    audit_completed: 0,
                    file_upload: 0,
                    profile_update: 0,
                    admin_change: 0,
                  };
                  const activityType = newActivity.activity_type as keyof Omit<DailyActivity, 'date'>;
                  if (activityType in newEntry) {
                    newEntry[activityType] = 1;
                  }
                  return [...prev, newEntry].sort((a, b) => 
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                }
              });
              
              // Update top users
              setTopUsers(prev => {
                const existing = prev.find(user => user.user_id === newActivity.user_id);
                if (existing) {
                  return prev
                    .map(user => 
                      user.user_id === newActivity.user_id
                        ? { ...user, count: user.count + 1 }
                        : user
                    )
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);
                } else {
                  return [...prev, { user_id: newActivity.user_id, count: 1 }]
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10);
                }
              });
              
              // Show toast notification
              toast.info('Dashboard Updated', {
                description: 'New activity recorded',
                duration: 2000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      setRawLogs(logs || []);

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

  const fetchComparisonStatistics = async () => {
    if (!comparisonDateRange?.from || !comparisonDateRange?.to) return;

    setComparisonLoading(true);
    try {
      const fromDate = startOfDay(comparisonDateRange.from);
      const toDate = endOfDay(comparisonDateRange.to);

      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('activity_type, created_at, user_id')
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString());

      if (error) throw error;

      setComparisonTotalActivities(logs?.length || 0);
      setComparisonRawLogs(logs || []);

      const typeCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      const hourlyCounts: Record<number, number> = {};
      const dailyCounts: Record<string, Record<string, number>> = {};

      logs?.forEach((log) => {
        typeCounts[log.activity_type] = (typeCounts[log.activity_type] || 0) + 1;
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
        const hour = new Date(log.created_at).getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
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

      setComparisonActivityTypeCounts(typeCountsArray);
      setComparisonHourlyActivity(hourlyArray);
      setComparisonDailyActivity(dailyArray);
      setComparisonTopUsers(topUsersArray);
    } catch (error) {
      console.error('Error fetching comparison statistics:', error);
    } finally {
      setComparisonLoading(false);
    }
  };

  const calculateVariance = (current: number, previous: number) => {
    if (previous === 0) return { percentage: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' };
    const percentage = ((current - previous) / previous) * 100;
    const trend = percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral';
    return { percentage: Math.abs(percentage), trend };
  };

  const VarianceIndicator = ({ current, previous }: { current: number; previous: number }) => {
    const { percentage, trend } = calculateVariance(current, previous);
    
    return (
      <div className={cn(
        "flex items-center gap-1 text-xs font-medium",
        trend === 'up' && "text-green-600",
        trend === 'down' && "text-red-600",
        trend === 'neutral' && "text-gray-500"
      )}>
        {trend === 'up' && <ArrowUp className="w-3 h-3" />}
        {trend === 'down' && <ArrowDown className="w-3 h-3" />}
        {trend === 'neutral' && <Minus className="w-3 h-3" />}
        <span>{percentage.toFixed(1)}%</span>
      </div>
    );
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Activity Statistics Report', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const dateRangeText = dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
        : 'N/A';
      pdf.text(`Period: ${dateRangeText}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 5;
      pdf.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 15;

      // Summary Statistics
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', 20, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Activities: ${totalActivities}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Time Period: ${getDaysCount()} days`, 20, yPosition);
      yPosition += 10;

      // Activity Type Breakdown
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Activity Type Distribution', 20, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      activityTypeCounts.forEach((item) => {
        const percentage = ((item.count / totalActivities) * 100).toFixed(1);
        pdf.text(`• ${item.activity_type.replace('_', ' ')}: ${item.count} (${percentage}%)`, 25, yPosition);
        yPosition += 5;
      });
      
      yPosition += 10;

      // Top Users
      if (topUsers.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Most Active Users (Top 5)', 20, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        topUsers.slice(0, 5).forEach((user, index) => {
          pdf.text(`${index + 1}. User ${user.user_id.slice(0, 8)}: ${user.count} activities`, 25, yPosition);
          yPosition += 5;
        });
      }

      yPosition += 10;

      // Peak Hours Summary
      const peakHour = hourlyActivity.reduce((max, curr) => curr.count > max.count ? curr : max, hourlyActivity[0]);
      if (peakHour) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Peak Activity Hours', 20, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Peak Hour: ${peakHour.hour}:00 with ${peakHour.count} activities`, 25, yPosition);
        yPosition += 5;
        
        // Top 3 peak hours
        const top3Hours = [...hourlyActivity]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        
        pdf.text('Top 3 Active Hours:', 25, yPosition);
        yPosition += 5;
        top3Hours.forEach((hour) => {
          pdf.text(`• ${hour.hour}:00 - ${hour.count} activities`, 30, yPosition);
          yPosition += 5;
        });
      }

      // Add new page for charts
      pdf.addPage();
      yPosition = 20;

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Visual Analytics', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Capture charts as images
      const chartElements = [
        { id: 'pie-chart', title: 'Activity Types Distribution' },
        { id: 'area-chart', title: 'Daily Activity Trends' },
        { id: 'bar-chart', title: 'Peak Usage Hours' },
      ];

      for (const chart of chartElements) {
        const element = document.getElementById(chart.id);
        if (element && yPosition < pageHeight - 100) {
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(chart.title, 20, yPosition);
          yPosition += 8;
          
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, Math.min(imgHeight, 80));
          yPosition += Math.min(imgHeight, 80) + 15;
        }
      }

      // Save PDF
      const fileName = `activity-stats-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`;
      pdf.save(fileName);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
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
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-6 h-6 text-[#0071E3]" />
          <h2 className="text-2xl font-bold text-[#111111]">Activity Statistics</h2>
          <Badge variant="secondary" className="font-mono text-xs">
            {dateRange?.from && dateRange?.to
              ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, yyyy")}`
              : "Select date range"}
          </Badge>
          {!comparisonMode && (
            <Badge variant="outline" className="font-mono text-xs border-green-500 text-green-700 bg-green-50">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse" />
              Live Updates
            </Badge>
          )}
          {comparisonMode && (
            <Badge variant="secondary" className="font-mono text-xs bg-purple-100 text-purple-700 border-purple-300">
              <GitCompare className="w-3 h-3 mr-1.5" />
              vs {comparisonDateRange?.from && comparisonDateRange?.to
                ? `${format(comparisonDateRange.from, "MMM dd")} - ${format(comparisonDateRange.to, "MMM dd")}`
                : "Select comparison range"}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Comparison Mode Toggle */}
          <Button
            variant={comparisonMode ? "default" : "outline"}
            size="sm"
            onClick={() => setComparisonMode(!comparisonMode)}
            className={cn(
              "h-9",
              comparisonMode && "bg-purple-600 hover:bg-purple-700"
            )}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare Periods
          </Button>

          {/* Quick Select Buttons */}
          {!comparisonMode && (
            <>
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
            </>
          )}
          
          {/* Custom Date Range Picker - Primary */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {comparisonMode ? "Primary Period" : "Custom Range"}
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

          {/* Comparison Date Range Picker */}
          {comparisonMode && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-purple-300">
                  <CalendarIcon className="w-4 h-4 mr-2 text-purple-600" />
                  Comparison Period
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white z-50" align="end">
                <Calendar
                  mode="range"
                  selected={comparisonDateRange}
                  onSelect={setComparisonDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Total Activities Badge with Comparison */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F9FAFB] border border-[#E5E5EA]">
            <Activity className="w-4 h-4 text-[#0071E3]" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#111111]">{totalActivities}</span>
                <span className="text-xs text-[#86868B]">activities</span>
              </div>
              {comparisonMode && !comparisonLoading && (
                <VarianceIndicator current={totalActivities} previous={comparisonTotalActivities} />
              )}
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={exportToPDF}
            disabled={exporting || totalActivities === 0}
            className="h-9 bg-[#0071E3] hover:bg-[#0071E3]/90"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Activity Types Distribution - Pie Chart */}
      <div className={cn("grid gap-6", comparisonMode ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        <Card className="border-[#E5E5EA]" id="pie-chart">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111]">
              Activity Types Distribution {comparisonMode && "(Primary)"}
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

        {comparisonMode && (
          <Card className="border-[#E5E5EA] border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
                Activity Types Distribution (Comparison)
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  Period 2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={comparisonActivityTypeCounts}
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
                      {comparisonActivityTypeCounts.map((entry, index) => (
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
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Daily Activity Trends - Stacked Area Chart */}
      <div className={cn("grid gap-6", comparisonMode ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        <Card className="border-[#E5E5EA]" id="area-chart">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111]">
              Daily Activity Trends {comparisonMode && "(Primary)"}
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

        {comparisonMode && (
          <Card className="border-[#E5E5EA] border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
                Daily Activity Trends (Comparison)
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  Period 2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={comparisonDailyActivity}>
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
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className={cn("grid gap-6", comparisonMode ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2")}>
        {/* Peak Usage Hours - Bar Chart */}
        <Card className="border-[#E5E5EA]" id="bar-chart">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0071E3]" />
              Peak Usage Hours {comparisonMode && "(Primary)"}
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

        {comparisonMode && (
          <Card className="border-[#E5E5EA] border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Peak Usage Hours (Comparison)
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  Period 2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonHourlyActivity}>
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
                    <Bar dataKey="count" fill="#9333ea" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Most Active Users - Leaderboard */}
        <Card className="border-[#E5E5EA]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0071E3]" />
              Most Active Users {comparisonMode && "(Primary)"}
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-semibold">
                        {user.count} activities
                      </Badge>
                      {comparisonMode && !comparisonLoading && (
                        <VarianceIndicator 
                          current={user.count} 
                          previous={comparisonTopUsers.find(u => u.user_id === user.user_id)?.count || 0} 
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {comparisonMode && (
          <Card className="border-[#E5E5EA] border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Most Active Users (Comparison)
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  Period 2
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {comparisonTopUsers.length === 0 ? (
                    <p className="text-sm text-[#86868B] text-center py-8">
                      No user activity data available
                    </p>
                  ) : (
                    comparisonTopUsers.map((user, index) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-3 rounded-xl bg-purple-50 hover:bg-white transition-all border border-purple-200"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                              ${index === 0 ? 'bg-[#FFD700] text-white' : 
                                index === 1 ? 'bg-[#C0C0C0] text-white' : 
                                index === 2 ? 'bg-[#CD7F32] text-white' : 
                                'bg-purple-200 text-purple-700'}
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
                        <Badge variant="secondary" className="font-semibold bg-purple-100 text-purple-700">
                          {user.count} activities
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Heatmap */}
      <div className={cn("grid gap-6", comparisonMode ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        <ActivityHeatmap 
          logs={rawLogs} 
          title={comparisonMode ? "Activity Heatmap (Primary)" : "Activity Heatmap"}
          isPrimary={true}
        />
        
        {comparisonMode && (
          comparisonLoading ? (
            <Card className="border-[#E5E5EA] border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
                  Activity Heatmap (Comparison)
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Period 2
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-[400px]">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <ActivityHeatmap 
              logs={comparisonRawLogs} 
              title="Activity Heatmap (Comparison)"
              isPrimary={false}
            />
          )
        )}
      </div>
    </div>
  );
};
