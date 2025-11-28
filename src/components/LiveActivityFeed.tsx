import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, User, FileUp, Settings, LogIn, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'login':
      return <LogIn className="w-4 h-4 text-green-500" />;
    case 'logout':
      return <LogOut className="w-4 h-4 text-gray-500" />;
    case 'audit_completed':
      return <Activity className="w-4 h-4 text-blue-500" />;
    case 'file_upload':
      return <FileUp className="w-4 h-4 text-purple-500" />;
    case 'profile_update':
      return <User className="w-4 h-4 text-orange-500" />;
    case 'admin_change':
      return <Settings className="w-4 h-4 text-red-500" />;
    default:
      return <Activity className="w-4 h-4 text-gray-500" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'login':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'logout':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'audit_completed':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'file_upload':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'profile_update':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'admin_change':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const LiveActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  useEffect(() => {
    // Set up realtime subscription for new activities
    const channel = supabase
      .channel('live-activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('New activity in feed:', payload);
          
          // Add new activity to the top and keep only 5 most recent
          setActivities((current) => 
            [payload.new as ActivityLog, ...current].slice(0, 5)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentActivities = async () => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, user_id, activity_type, description, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching activities:', error);
      return;
    }

    setActivities(data || []);
  };

  return (
    <Card className="border-[#E5E5EA] shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#0071E3]" />
          Live Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-[#86868B] text-center py-4">
            No recent activity
          </p>
        ) : (
          activities.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-[#E5E5EA] bg-[#F9FAFB] hover:bg-white transition-all animate-fade-in"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-[#111111] line-clamp-2 leading-snug">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-0 ${getActivityColor(activity.activity_type)}`}
                  >
                    {activity.activity_type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-[#86868B]">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
