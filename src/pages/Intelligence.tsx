import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Brain, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import { FingerprintCollisionReport } from "@/components/intelligence/FingerprintCollisionReport";
import { TimezoneMismatchDetection } from "@/components/intelligence/TimezoneMismatchDetection";
import { BotLikelihoodScoring } from "@/components/intelligence/BotLikelihoodScoring";
import { BehavioralBiometricsPanel } from "@/components/intelligence/BehavioralBiometricsPanel";
import { FeatureUsageHeatmap } from "@/components/intelligence/FeatureUsageHeatmap";

interface IntelligenceMetrics {
  totalUsers: number;
  suspiciousUsers: number;
  collisionCount: number;
  timezoneMismatches: number;
  highRiskBots: number;
  avgBotScore: number;
}

export default function Intelligence() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<IntelligenceMetrics>({
    totalUsers: 0,
    suspiciousUsers: 0,
    collisionCount: 0,
    timezoneMismatches: 0,
    highRiskBots: 0,
    avgBotScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntelligenceMetrics();
  }, []);

  const fetchIntelligenceMetrics = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { count: userCount } = await supabase
        .from('user_usage')
        .select('*', { count: 'exact', head: true });

      // Fetch fingerprint collisions
      const { data: fingerprints } = await supabase
        .from('user_fingerprints')
        .select('fingerprint_hash, user_id');

      const hashGroups = new Map<string, Set<string>>();
      fingerprints?.forEach(fp => {
        if (!fp.user_id) return;
        const existing = hashGroups.get(fp.fingerprint_hash) || new Set();
        existing.add(fp.user_id);
        hashGroups.set(fp.fingerprint_hash, existing);
      });

      const collisionCount = Array.from(hashGroups.values()).filter(
        users => users.size > 1
      ).length;

      // Fetch blocked IPs with detection data
      const { data: blockedIps } = await supabase
        .from('blocked_ips')
        .select('*')
        .not('detection_data', 'is', null);

      // Calculate timezone mismatches and bot scores
      let timezoneMismatches = 0;
      let totalBotScore = 0;
      let highRiskBots = 0;

      blockedIps?.forEach(ip => {
        const detectionData = ip.detection_data as any;
        
        // Check timezone mismatch
        if (detectionData?.timezone && detectionData?.country_code) {
          // Simple heuristic: if fraud_score > 75, likely timezone mismatch
          if (ip.fraud_score && ip.fraud_score > 75) {
            timezoneMismatches++;
          }
        }

        // Bot likelihood scoring
        if (ip.fraud_score) {
          totalBotScore += ip.fraud_score;
          if (ip.fraud_score >= 85) {
            highRiskBots++;
          }
        }
      });

      const avgBotScore = blockedIps?.length 
        ? Math.round(totalBotScore / blockedIps.length)
        : 0;

      const suspiciousUsers = collisionCount + timezoneMismatches + highRiskBots;

      setMetrics({
        totalUsers: userCount || 0,
        suspiciousUsers,
        collisionCount,
        timezoneMismatches,
        highRiskBots,
        avgBotScore,
      });

    } catch (error) {
      console.error('Error fetching intelligence metrics:', error);
      toast.error('Failed to load intelligence metrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-[#E5E5EA] bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              className="text-[#1D1D1F]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-[#0071E3]" />
              <h1 className="text-2xl font-bold text-[#1D1D1F]">
                User Intelligence Dashboard
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-[1600px] mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-[#E5E5EA] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#86868B]">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#1D1D1F]">
                {metrics.totalUsers}
              </div>
              <p className="text-xs text-[#86868B] mt-1">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Suspicious Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">
                {metrics.suspiciousUsers}
              </div>
              <p className="text-xs text-red-700 mt-1">
                Requires investigation
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#E5E5EA] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#86868B]">
                Fingerprint Collisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#1D1D1F]">
                {metrics.collisionCount}
              </div>
              <p className="text-xs text-[#86868B] mt-1">Ban evasion detected</p>
            </CardContent>
          </Card>

          <Card className="border-[#E5E5EA] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#86868B]">
                Timezone Mismatches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#1D1D1F]">
                {metrics.timezoneMismatches}
              </div>
              <p className="text-xs text-[#86868B] mt-1">Potential VPN usage</p>
            </CardContent>
          </Card>

          <Card className="border-[#E5E5EA] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#86868B]">
                High-Risk Bots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#1D1D1F]">
                {metrics.highRiskBots}
              </div>
              <p className="text-xs text-[#86868B] mt-1">Bot score ≥ 85%</p>
            </CardContent>
          </Card>

          <Card className="border-[#E5E5EA] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#86868B]">
                Avg Bot Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#1D1D1F]">
                {metrics.avgBotScore}%
              </div>
              <p className="text-xs text-[#86868B] mt-1">Across all IPs</p>
            </CardContent>
          </Card>
        </div>

        {/* Intelligence Reports */}
        <Tabs defaultValue="collisions" className="space-y-6">
          <TabsList className="bg-[#F5F5F7] border border-[#E5E5EA]">
            <TabsTrigger value="collisions" className="data-[state=active]:bg-white">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Collision Reports
            </TabsTrigger>
            <TabsTrigger value="timezone" className="data-[state=active]:bg-white">
              <TrendingUp className="h-4 w-4 mr-2" />
              Timezone Analysis
            </TabsTrigger>
            <TabsTrigger value="bots" className="data-[state=active]:bg-white">
              <Brain className="h-4 w-4 mr-2" />
              Bot Detection
            </TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-white">
              <Activity className="h-4 w-4 mr-2" />
              Feature Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collisions" className="space-y-6">
            <FingerprintCollisionReport onRefresh={fetchIntelligenceMetrics} />
          </TabsContent>

          <TabsContent value="timezone" className="space-y-6">
            <TimezoneMismatchDetection />
          </TabsContent>

          <TabsContent value="bots" className="space-y-6">
            <BotLikelihoodScoring />
            <BehavioralBiometricsPanel />
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <FeatureUsageHeatmap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
