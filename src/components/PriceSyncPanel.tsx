import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const PriceSyncPanel = () => {
  const [syncing, setSyncing] = useState(false);

  // Fetch latest sync timestamp
  const { data: latestSync, refetch } = useQuery({
    queryKey: ['latest-price-sync'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_models')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data?.last_updated;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch model count
  const { data: modelCount } = useQuery({
    queryKey: ['ai-models-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ai_models')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-prices');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('Prices synced successfully', {
          description: `Updated ${data.synced} model prices from OpenRouter`,
        });
        refetch();
      } else {
        throw new Error(data?.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Price sync error:', error);
      toast.error('Failed to sync prices', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="border-[#E5E5EA]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#111111] flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#0071E3]" />
          AI Model Pricing
        </CardTitle>
        <CardDescription>
          Track real-time model pricing to prevent cost spikes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E5EA]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-[#86868B] font-medium">Models Tracked</span>
            </div>
            <p className="text-2xl font-bold text-[#111111]">{modelCount || 0}</p>
          </div>
          
          <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E5EA]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-[#86868B] font-medium">Last Synced</span>
            </div>
            {latestSync ? (
              <p className="text-sm font-mono text-[#111111]">
                {format(new Date(latestSync), 'PPpp')}
              </p>
            ) : (
              <p className="text-sm text-[#86868B]">Never synced</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E5E5EA]">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              Live Pricing
            </Badge>
            <span className="text-xs text-[#86868B]">
              Prices fetched from OpenRouter API
            </span>
          </div>
          
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-[#0071E3] hover:bg-[#0071E3]/90"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Prices Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
