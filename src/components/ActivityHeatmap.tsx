import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Activity } from "lucide-react";

interface ActivityLog {
  created_at: string;
}

interface ActivityHeatmapProps {
  logs: ActivityLog[];
  title?: string;
  isPrimary?: boolean;
}

export const ActivityHeatmap = ({ logs, title = "Activity Heatmap", isPrimary = true }: ActivityHeatmapProps) => {
  const heatmapData = useMemo(() => {
    // Create a map of date-hour combinations to activity counts
    const countMap: Record<string, Record<number, number>> = {};
    
    logs.forEach((log) => {
      const date = format(parseISO(log.created_at), 'yyyy-MM-dd');
      const hour = new Date(log.created_at).getHours();
      
      if (!countMap[date]) {
        countMap[date] = {};
      }
      countMap[date][hour] = (countMap[date][hour] || 0) + 1;
    });
    
    // Sort dates and get all unique dates
    const dates = Object.keys(countMap).sort();
    
    // Find max count for color scaling
    let maxCount = 0;
    Object.values(countMap).forEach(hourCounts => {
      Object.values(hourCounts).forEach(count => {
        maxCount = Math.max(maxCount, count);
      });
    });
    
    return { countMap, dates, maxCount };
  }, [logs]);
  
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-50 border-gray-100';
    
    const intensity = count / heatmapData.maxCount;
    
    if (isPrimary) {
      if (intensity > 0.75) return 'bg-blue-600 border-blue-700';
      if (intensity > 0.5) return 'bg-blue-500 border-blue-600';
      if (intensity > 0.25) return 'bg-blue-400 border-blue-500';
      return 'bg-blue-200 border-blue-300';
    } else {
      if (intensity > 0.75) return 'bg-purple-600 border-purple-700';
      if (intensity > 0.5) return 'bg-purple-500 border-purple-600';
      if (intensity > 0.25) return 'bg-purple-400 border-purple-500';
      return 'bg-purple-200 border-purple-300';
    }
  };
  
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <Card className={cn("border-[#E5E5EA]", !isPrimary && "border-purple-200")}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
          <Activity className={cn("w-5 h-5", isPrimary ? "text-[#0071E3]" : "text-purple-600")} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between text-xs text-[#86868B]">
            <span>Less activity</span>
            <div className="flex items-center gap-1">
              <div className={cn("w-4 h-4 rounded border", isPrimary ? "bg-blue-200 border-blue-300" : "bg-purple-200 border-purple-300")} />
              <div className={cn("w-4 h-4 rounded border", isPrimary ? "bg-blue-400 border-blue-500" : "bg-purple-400 border-purple-500")} />
              <div className={cn("w-4 h-4 rounded border", isPrimary ? "bg-blue-500 border-blue-600" : "bg-purple-500 border-purple-600")} />
              <div className={cn("w-4 h-4 rounded border", isPrimary ? "bg-blue-600 border-blue-700" : "bg-purple-600 border-purple-700")} />
            </div>
            <span>More activity</span>
          </div>
          
          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hour labels */}
              <div className="flex items-center mb-2">
                <div className="w-20 flex-shrink-0" />
                <div className="flex gap-1">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="w-8 h-6 flex items-center justify-center text-xs text-[#86868B] font-mono"
                    >
                      {hour % 3 === 0 ? hour : ''}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Date rows */}
              <div className="space-y-1">
                {heatmapData.dates.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#86868B]">
                    No activity data available for heatmap
                  </div>
                ) : (
                  heatmapData.dates.map((date) => (
                    <div key={date} className="flex items-center group">
                      <div className="w-20 flex-shrink-0 text-xs text-[#86868B] pr-2 font-mono">
                        {format(parseISO(date), 'MMM dd')}
                      </div>
                      <div className="flex gap-1">
                        {hours.map((hour) => {
                          const count = heatmapData.countMap[date]?.[hour] || 0;
                          return (
                            <div
                              key={hour}
                              className={cn(
                                "w-8 h-8 rounded border transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md relative group/cell",
                                getColorIntensity(count)
                              )}
                              title={`${format(parseISO(date), 'MMM dd')} at ${hour}:00 - ${count} activities`}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-opacity z-10">
                                {count} {count === 1 ? 'activity' : 'activities'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Stats Summary */}
          {heatmapData.dates.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#E5E5EA]">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    Peak: {heatmapData.maxCount}
                  </Badge>
                  <span className="text-[#86868B]">activities/hour</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {heatmapData.dates.length}
                  </Badge>
                  <span className="text-[#86868B]">days tracked</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
