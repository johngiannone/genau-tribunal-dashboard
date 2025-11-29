import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Shield, Activity, AlertTriangle, Fingerprint, Bot } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserProfile {
  user_id: string;
  email: string | null;
  audit_count: number;
  audits_this_month: number;
  files_this_month: number;
  is_premium: boolean;
  subscription_tier: string | null;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  account_status: 'active' | 'inactive' | 'disabled';
  created_at: string;
  updated_at: string | null;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
}

interface SecurityLog {
  id: string;
  flag_category: string;
  prompt: string;
  flagged_at: string;
  metadata: any;
}

interface Fingerprint {
  id: string;
  fingerprint_hash: string;
  collected_at: string;
  platform: string | null;
  screen_resolution: string | null;
  timezone_offset: number | null;
  user_agent: string | null;
}

interface BehavioralSignal {
  id: string;
  session_id: string;
  bot_likelihood_score: number | null;
  collected_at: string;
  total_mouse_events: number | null;
  total_click_events: number | null;
  total_keystroke_events: number | null;
}

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
  const [behavioralSignals, setBehavioralSignals] = useState<BehavioralSignal[]>([]);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Fetch user profile from user_usage
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (usageError) throw usageError;

      // Fetch email from profiles separately
      let userEmail = null;
      if (usageData) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .maybeSingle();
        
        userEmail = profileData?.email || null;
        
        setProfile({
          ...usageData,
          email: userEmail
        });
      }

      // Fetch activity logs
      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activityError) throw activityError;
      setActivityLogs(activityData || []);

      // Fetch security logs
      const { data: securityData, error: securityError } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', userId)
        .order('flagged_at', { ascending: false })
        .limit(50);

      if (securityError) throw securityError;
      setSecurityLogs(securityData || []);

      // Fetch fingerprints
      const { data: fingerprintData, error: fingerprintError } = await supabase
        .from('user_fingerprints')
        .select('*')
        .eq('user_id', userId)
        .order('collected_at', { ascending: false })
        .limit(20);

      if (fingerprintError) throw fingerprintError;
      setFingerprints(fingerprintData || []);

      // Fetch behavioral signals
      const { data: behavioralData, error: behavioralError } = await supabase
        .from('behavioral_signals')
        .select('*')
        .eq('user_id', userId)
        .order('collected_at', { ascending: false })
        .limit(20);

      if (behavioralError) throw behavioralError;
      setBehavioralSignals(behavioralData || []);

      // Fetch audit history from training_dataset
      const { data: auditData, error: auditError } = await supabase
        .from('training_dataset')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditError) throw auditError;
      setAuditHistory(auditData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#111111] mb-2">User Not Found</h2>
          <p className="text-[#86868B] mb-4">The requested user profile could not be found.</p>
          <Button onClick={() => navigate('/admin')} className="bg-[#0071E3] hover:bg-[#0077ED]">
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="text-[#86868B] hover:text-[#0071E3]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Shield className="w-8 h-8 text-[#0071E3]" />
            <div>
              <h1 className="text-3xl font-bold text-[#111111]">User Profile</h1>
              <p className="text-[#86868B] text-sm mt-1">{profile.email || 'No email'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={profile.account_status === 'active' ? 'default' : 'destructive'}
              className="text-sm"
            >
              {profile.account_status.toUpperCase()}
            </Badge>
            {profile.is_banned && (
              <Badge variant="destructive" className="text-sm">BANNED</Badge>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-[#E5E5EA]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#86868B]">Total Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#111111]">{profile.audit_count}</p>
            </CardContent>
          </Card>
          
          <Card className="border-[#E5E5EA]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#86868B]">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#111111]">{profile.audits_this_month}</p>
            </CardContent>
          </Card>
          
          <Card className="border-[#E5E5EA]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#86868B]">Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#111111] capitalize">
                {profile.subscription_tier || 'free'}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[#E5E5EA]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#86868B]">Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#111111]">{securityLogs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList className="bg-[#F9FAFB] border border-[#E5E5EA]">
            <TabsTrigger value="activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="audits">
              <Shield className="w-4 h-4 mr-2" />
              Audits
            </TabsTrigger>
            <TabsTrigger value="security">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="fingerprints">
              <Fingerprint className="w-4 h-4 mr-2" />
              Fingerprints
            </TabsTrigger>
            <TabsTrigger value="behavior">
              <Bot className="w-4 h-4 mr-2" />
              Behavior
            </TabsTrigger>
          </TabsList>

          {/* Activity Logs Tab */}
          <TabsContent value="activity">
            <Card className="border-[#E5E5EA]">
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>Recent user activity and events</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.length > 0 ? (
                      activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.activity_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{log.description}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.ip_address || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-[#86868B]">
                            {formatDate(log.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-[#86868B]">
                          No activity logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit History Tab */}
          <TabsContent value="audits">
            <Card className="border-[#E5E5EA]">
              <CardHeader>
                <CardTitle>Audit History</CardTitle>
                <CardDescription>Complete audit execution history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditHistory.length > 0 ? (
                      auditHistory.map((audit) => (
                        <TableRow key={audit.id}>
                          <TableCell className="max-w-md truncate">{audit.prompt}</TableCell>
                          <TableCell>
                            {audit.human_rating === 1 && <Badge className="bg-green-600">Good</Badge>}
                            {audit.human_rating === -1 && <Badge variant="destructive">Bad</Badge>}
                            {audit.human_rating === 0 && <Badge variant="outline">Unrated</Badge>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{audit.council_source || 'default'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-[#86868B]">
                            {formatDate(audit.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-[#86868B]">
                          No audit history found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Logs Tab */}
          <TabsContent value="security">
            <Card className="border-[#E5E5EA]">
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Flagged content and security violations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityLogs.length > 0 ? (
                      securityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="destructive">{log.flag_category}</Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{log.prompt}</TableCell>
                          <TableCell className="text-sm text-[#86868B]">
                            {formatDate(log.flagged_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-[#86868B]">
                          No security events found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fingerprints Tab */}
          <TabsContent value="fingerprints">
            <Card className="border-[#E5E5EA]">
              <CardHeader>
                <CardTitle>Device Fingerprints</CardTitle>
                <CardDescription>Collected device fingerprint data</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hash</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Resolution</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fingerprints.length > 0 ? (
                      fingerprints.map((fp) => (
                        <TableRow key={fp.id}>
                          <TableCell className="font-mono text-xs">
                            {fp.fingerprint_hash.slice(0, 16)}...
                          </TableCell>
                          <TableCell>{fp.platform || 'Unknown'}</TableCell>
                          <TableCell>{fp.screen_resolution || 'N/A'}</TableCell>
                          <TableCell className="text-sm text-[#86868B]">
                            {formatDate(fp.collected_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-[#86868B]">
                          No fingerprints found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Behavioral Signals Tab */}
          <TabsContent value="behavior">
            <Card className="border-[#E5E5EA]">
              <CardHeader>
                <CardTitle>Behavioral Analysis</CardTitle>
                <CardDescription>Bot detection and behavioral signals</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Bot Score</TableHead>
                      <TableHead>Mouse Events</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {behavioralSignals.length > 0 ? (
                      behavioralSignals.map((signal) => (
                        <TableRow key={signal.id}>
                          <TableCell className="font-mono text-xs">
                            {signal.session_id.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={(signal.bot_likelihood_score || 0) >= 70 ? 'destructive' : 'outline'}
                            >
                              {signal.bot_likelihood_score || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>{signal.total_mouse_events || 0}</TableCell>
                          <TableCell>{signal.total_click_events || 0}</TableCell>
                          <TableCell className="text-sm text-[#86868B]">
                            {formatDate(signal.collected_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-[#86868B]">
                          No behavioral data found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminUserDetail;