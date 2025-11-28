import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CostAlert {
  id: string;
  user_id: string;
  alert_type: 'daily_threshold' | 'audit_threshold' | 'budget_forecast';
  estimated_cost: number;
  threshold: number;
  created_at: string;
  notified_via_email: boolean;
  email_sent_at: string | null;
}

export const CostAlertsPanel = () => {
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('cost_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cost_alerts'
        },
        (payload) => {
          const newAlert = payload.new as CostAlert;
          setAlerts(prev => [newAlert, ...prev]);
          
          // Show toast notification
          const alertTypeLabel = newAlert.alert_type === 'daily_threshold' ? 'Daily' : 'Per-Audit';
          toast.error(
            `${alertTypeLabel} cost threshold exceeded: $${newAlert.estimated_cost.toFixed(4)} > $${newAlert.threshold.toFixed(4)}`,
            {
              description: `User: ${newAlert.user_id.slice(0, 8)}...`,
              duration: 10000,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('cost_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching cost alerts:', error);
      toast.error("Failed to load cost alerts");
    } finally {
      setLoading(false);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    if (type === 'daily_threshold') return 'Daily Threshold';
    if (type === 'budget_forecast') return 'Budget Forecast';
    return 'Per-Audit Threshold';
  };

  const getAlertTypeColor = (type: string) => {
    if (type === 'daily_threshold') return 'bg-red-500';
    if (type === 'budget_forecast') return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Alerts</CardTitle>
          <CardDescription>Loading alerts...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <CardTitle>Cost Alerts</CardTitle>
            <CardDescription>
              Real-time notifications when cost thresholds are exceeded
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No cost alerts triggered yet
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-[#E5E5EA] bg-white hover:bg-[#F9FAFB] transition-colors"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${getAlertTypeColor(alert.alert_type)}`} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive">
                      {getAlertTypeLabel(alert.alert_type)}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">User:</span>{' '}
                      <span className="font-mono text-xs">{alert.user_id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="text-muted-foreground">Cost:</span>{' '}
                      <span className="font-semibold text-red-600">
                        ${alert.estimated_cost.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Threshold:</span>{' '}
                      <span className="font-semibold">
                        ${alert.threshold.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {alert.notified_via_email && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      ✓ Email sent {alert.email_sent_at && `(${formatDistanceToNow(new Date(alert.email_sent_at), { addSuffix: true })})`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};