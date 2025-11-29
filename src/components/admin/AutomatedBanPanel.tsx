import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Play, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RiskSignal {
  userId: string;
  email: string;
  riskScore: number;
  riskFactors: string[];
  fingerprintCollision: boolean;
  highBotScore: boolean;
  timezoneMismatch: boolean;
  vpnDetected: boolean;
}

export function AutomatedBanPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [results, setResults] = useState<{
    autoBannedCount: number;
    riskSignalsCount: number;
    riskSignals: RiskSignal[];
  } | null>(null);

  const runAnalysis = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-security-risks');

      if (error) throw error;

      setResults(data);
      setLastRun(new Date());
      
      if (data.autoBannedCount > 0) {
        toast.success(`Auto-banned ${data.autoBannedCount} high-risk user(s)`);
      } else {
        toast.success('Analysis complete. No threats detected.');
      }
    } catch (error) {
      console.error('Error running security analysis:', error);
      toast.error('Failed to run security analysis');
    } finally {
      setIsRunning(false);
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive">Critical ({score})</Badge>;
    if (score >= 50) return <Badge className="bg-orange-500">High ({score})</Badge>;
    return <Badge className="bg-yellow-500">Medium ({score})</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Automated Ban Workflow
              </CardTitle>
              <CardDescription>
                Automatically detect and ban users with multiple risk signals
              </CardDescription>
            </div>
            <Button onClick={runAnalysis} disabled={isRunning}>
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Analysis'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Risk Thresholds */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Fingerprint Collision</div>
                <div className="text-2xl font-bold">30 pts</div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">High Bot Score (≥70%)</div>
                <div className="text-2xl font-bold">40 pts</div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">Fraud Score (≥75)</div>
                <div className="text-2xl font-bold">20 pts</div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="text-sm text-muted-foreground mb-1">VPN/Proxy Detected</div>
                <div className="text-2xl font-bold">15 pts</div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Auto-Ban Threshold: 70+ points</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Users who accumulate 70 or more risk points are automatically banned and logged to activity logs.
              </p>
            </div>

            {lastRun && (
              <div className="text-sm text-muted-foreground">
                Last run: {lastRun.toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-red-500 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Auto-Banned</span>
                  </div>
                  <div className="text-3xl font-bold">{results.autoBannedCount}</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 text-yellow-500 mb-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Elevated Risk</span>
                  </div>
                  <div className="text-3xl font-bold">{results.riskSignalsCount}</div>
                </div>
              </div>

              {/* Risk Signals Table */}
              {results.riskSignals && results.riskSignals.length > 0 && (
                <div className="border rounded-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 text-sm font-medium">User Email</th>
                          <th className="text-left p-3 text-sm font-medium">Risk Score</th>
                          <th className="text-left p-3 text-sm font-medium">Risk Factors</th>
                          <th className="text-left p-3 text-sm font-medium">Signals</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.riskSignals.map((signal, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="p-3 text-sm">{signal.email}</td>
                            <td className="p-3">{getRiskBadge(signal.riskScore)}</td>
                            <td className="p-3 text-sm text-muted-foreground max-w-md">
                              {signal.riskFactors.join('; ')}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap">
                                {signal.fingerprintCollision && (
                                  <Badge variant="outline" className="text-xs">Fingerprint</Badge>
                                )}
                                {signal.highBotScore && (
                                  <Badge variant="outline" className="text-xs">Bot</Badge>
                                )}
                                {signal.timezoneMismatch && (
                                  <Badge variant="outline" className="text-xs">Fraud</Badge>
                                )}
                                {signal.vpnDetected && (
                                  <Badge variant="outline" className="text-xs">VPN</Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
