import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BotScore {
  userId: string | null;
  ipAddress: string;
  fraudScore: number;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  riskFactors: string[];
  detectedAt: string;
}

export function BotLikelihoodScoring() {
  const [botScores, setBotScores] = useState<BotScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgScore, setAvgScore] = useState(0);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);

  useEffect(() => {
    fetchBotScores();
  }, []);

  const fetchBotScores = async () => {
    try {
      setLoading(true);

      const { data: blockedIps, error } = await supabase
        .from('blocked_ips')
        .select('*')
        .not('fraud_score', 'is', null)
        .order('fraud_score', { ascending: false })
        .limit(100);

      if (error) throw error;

      const scores: BotScore[] = [];
      let totalScore = 0;

      blockedIps?.forEach(ip => {
        const riskFactors: string[] = [];
        if (ip.is_vpn) riskFactors.push('VPN');
        if (ip.is_proxy) riskFactors.push('Proxy');
        if (ip.is_tor) riskFactors.push('Tor');
        if (ip.fraud_score && ip.fraud_score >= 85) riskFactors.push('High Fraud Score');

        scores.push({
          userId: ip.associated_user_id,
          ipAddress: ip.ip_address,
          fraudScore: ip.fraud_score || 0,
          isVpn: ip.is_vpn || false,
          isProxy: ip.is_proxy || false,
          isTor: ip.is_tor || false,
          riskFactors,
          detectedAt: ip.blocked_at,
        });

        totalScore += ip.fraud_score || 0;
      });

      setBotScores(scores);
      setAvgScore(scores.length > 0 ? Math.round(totalScore / scores.length) : 0);

      // Calculate score distribution
      const distribution = [
        { range: '0-20', count: scores.filter(s => s.fraudScore >= 0 && s.fraudScore < 20).length, color: '#4ade80' },
        { range: '20-40', count: scores.filter(s => s.fraudScore >= 20 && s.fraudScore < 40).length, color: '#86efac' },
        { range: '40-60', count: scores.filter(s => s.fraudScore >= 40 && s.fraudScore < 60).length, color: '#fbbf24' },
        { range: '60-80', count: scores.filter(s => s.fraudScore >= 60 && s.fraudScore < 80).length, color: '#fb923c' },
        { range: '80-100', count: scores.filter(s => s.fraudScore >= 80).length, color: '#ef4444' },
      ];
      setScoreDistribution(distribution);

    } catch (error) {
      console.error('Error fetching bot scores:', error);
      toast.error('Failed to load bot scoring data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 85) return 'text-red-600';
    if (score >= 70) return 'text-orange-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 85) return <Badge variant="destructive">Critical Risk</Badge>;
    if (score >= 70) return <Badge variant="secondary">High Risk</Badge>;
    if (score >= 50) return <Badge variant="outline">Medium Risk</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Low Risk</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading bot detection data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Bot Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRiskColor(avgScore)}`}>
              {avgScore}%
            </div>
            <Progress value={avgScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High-Risk Detections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {botScores.filter(s => s.fraudScore >= 85).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score ≥ 85%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1D1D1F]">
              {botScores.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">IP addresses</p>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Bot Score Distribution
          </CardTitle>
          <CardDescription>
            Distribution of fraud scores across all detected IPs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {scoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Bot Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Bot Likelihood Scores
          </CardTitle>
          <CardDescription>
            Individual fraud scores and risk assessments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {botScores.slice(0, 20).map((score, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F7] transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{score.ipAddress}</span>
                    {getRiskBadge(score.fraudScore)}
                    {score.userId && (
                      <Badge variant="outline" className="text-xs">
                        User ID: {score.userId.substring(0, 8)}...
                      </Badge>
                    )}
                  </div>
                  {score.riskFactors.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>Risk factors: {score.riskFactors.join(', ')}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getRiskColor(score.fraudScore)}`}>
                    {score.fraudScore}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(score.detectedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
