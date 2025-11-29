import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Mouse, Keyboard, Hand, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface BiometricSignal {
  id: string;
  user_id: string | null;
  session_id: string;
  avg_mouse_velocity: number;
  mouse_velocity_variance: number;
  total_mouse_events: number;
  avg_keystroke_interval: number;
  keystroke_interval_variance: number;
  total_keystroke_events: number;
  time_to_first_click: number | null;
  avg_click_interval: number;
  total_click_events: number;
  click_accuracy_score: number;
  bot_likelihood_score: number;
  bot_indicators: string[];
  collected_at: string;
}

export function BehavioralBiometricsPanel() {
  const [signals, setSignals] = useState<BiometricSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgBotScore, setAvgBotScore] = useState(0);
  const [highRiskCount, setHighRiskCount] = useState(0);

  useEffect(() => {
    fetchBiometricsData();
  }, []);

  const fetchBiometricsData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('behavioral_signals')
        .select('*')
        .order('bot_likelihood_score', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Type cast bot_indicators from Json to string[]
      const typedData = (data || []).map(signal => ({
        ...signal,
        bot_indicators: Array.isArray(signal.bot_indicators) 
          ? signal.bot_indicators as string[]
          : [],
      }));

      setSignals(typedData);

      // Calculate metrics
      if (typedData && typedData.length > 0) {
        const totalScore = typedData.reduce((sum, s) => sum + s.bot_likelihood_score, 0);
        setAvgBotScore(Math.round(totalScore / typedData.length));
        setHighRiskCount(typedData.filter(s => s.bot_likelihood_score >= 70).length);
      }

    } catch (error) {
      console.error('Error fetching biometrics data:', error);
      toast.error('Failed to load behavioral biometrics data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive">High Risk Bot</Badge>;
    if (score >= 40) return <Badge variant="secondary">Suspicious</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Human-like</Badge>;
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading behavioral biometrics...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (signals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Behavioral Biometrics
          </CardTitle>
          <CardDescription>
            No behavioral data collected yet. User interactions will appear here.
          </CardDescription>
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
              Avg Bot Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRiskColor(avgBotScore)}`}>
              {avgBotScore}%
            </div>
            <Progress value={avgBotScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High-Risk Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {highRiskCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bot score ≥ 70%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#1D1D1F]">
              {signals.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* High-Risk Alerts */}
      {highRiskCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              High-Risk Bot Behavior Detected
            </CardTitle>
            <CardDescription className="text-red-700">
              {highRiskCount} session{highRiskCount !== 1 ? 's' : ''} with bot likelihood ≥ 70%
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Detailed Behavioral Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Behavioral Analysis Results
          </CardTitle>
          <CardDescription>
            Real-time bot detection based on mouse, keyboard, and click patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Bot Score</TableHead>
                <TableHead>Mouse Behavior</TableHead>
                <TableHead>Keyboard Behavior</TableHead>
                <TableHead>Click Behavior</TableHead>
                <TableHead>Indicators</TableHead>
                <TableHead>Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signals.map((signal) => (
                <TableRow key={signal.id}>
                  <TableCell className="font-mono text-xs">
                    {signal.session_id.substring(0, 8)}...
                    {signal.user_id && (
                      <div className="text-[10px] text-muted-foreground">
                        User: {signal.user_id.substring(0, 8)}...
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getRiskBadge(signal.bot_likelihood_score)}
                      <div className={`text-2xl font-bold ${getRiskColor(signal.bot_likelihood_score)}`}>
                        {signal.bot_likelihood_score}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <Mouse className="h-3 w-3" />
                        {signal.total_mouse_events} events
                      </div>
                      <div className="text-muted-foreground">
                        Velocity: {Math.round(signal.avg_mouse_velocity)} px/s
                      </div>
                      <div className="text-muted-foreground">
                        Variance: {Math.round(signal.mouse_velocity_variance)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <Keyboard className="h-3 w-3" />
                        {signal.total_keystroke_events} keys
                      </div>
                      <div className="text-muted-foreground">
                        Avg interval: {Math.round(signal.avg_keystroke_interval)}ms
                      </div>
                      <div className="text-muted-foreground">
                        Variance: {Math.round(signal.keystroke_interval_variance)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        <Hand className="h-3 w-3" />
                        {signal.total_click_events} clicks
                      </div>
                      <div className="text-muted-foreground">
                        First click: {signal.time_to_first_click !== null 
                          ? `${Math.round(signal.time_to_first_click)}ms`
                          : 'N/A'}
                      </div>
                      <div className="text-muted-foreground">
                        Accuracy: {Math.round(signal.click_accuracy_score)}%
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {signal.bot_indicators.slice(0, 2).map((indicator, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px]">
                          {indicator.substring(0, 30)}...
                        </Badge>
                      ))}
                      {signal.bot_indicators.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{signal.bot_indicators.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(signal.collected_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
