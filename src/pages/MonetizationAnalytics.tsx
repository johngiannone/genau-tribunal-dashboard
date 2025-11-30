import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Zap, Users, FolderOpen, MousePointer, TrendingUp } from "lucide-react";

export const MonetizationAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [turboStats, setTurboStats] = useState({ used: 0, total: 0, adoptionRate: 0 });
  const [expertStats, setExpertStats] = useState({ clicks: 0, impressions: 0, ctr: 0 });
  const [teamStats, setTeamStats] = useState({ invites: 0, activeMembers: 0, organizations: 0 });
  const [folderStats, setFolderStats] = useState({ foldersCreated: 0, conversationsMoved: 0, avgPerFolder: 0 });
  const [dailyTrends, setDailyTrends] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all activity logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activities } = await supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (!activities) return;

      // Calculate Turbo Mode stats
      const turboUsed = activities.filter(a => a.activity_type === 'turbo_mode_used').length;
      const totalAudits = activities.filter(a => a.activity_type === 'audit_completed').length;
      const turboAdoption = totalAudits > 0 ? (turboUsed / totalAudits) * 100 : 0;

      setTurboStats({
        used: turboUsed,
        total: totalAudits,
        adoptionRate: Math.round(turboAdoption)
      });

      // Calculate Expert Marketplace stats
      const expertClicks = activities.filter(a => a.activity_type === 'expert_marketplace_clicked').length;
      // Count audit_completed as impressions (when the verdict shows)
      const expertImpressions = totalAudits;
      const expertCTR = expertImpressions > 0 ? (expertClicks / expertImpressions) * 100 : 0;

      setExpertStats({
        clicks: expertClicks,
        impressions: expertImpressions,
        ctr: Math.round(expertCTR * 10) / 10
      });

      // Calculate Folder stats
      const foldersCreated = activities.filter(a => a.activity_type === 'folder_created').length;
      const conversationsMoved = activities.filter(a => a.activity_type === 'conversation_moved_to_folder').length;
      const avgPerFolder = foldersCreated > 0 ? Math.round(conversationsMoved / foldersCreated) : 0;

      setFolderStats({
        foldersCreated,
        conversationsMoved,
        avgPerFolder
      });

      // Calculate Team stats
      const teamInvites = activities.filter(a => a.activity_type === 'team_member_invited').length;

      const { data: orgs, count: orgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      const { data: members, count: memberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('invite_status', 'accepted');

      setTeamStats({
        invites: teamInvites,
        activeMembers: memberCount || 0,
        organizations: orgCount || 0
      });

      // Calculate daily trends for the last 7 days
      const trends: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));

        const dayActivities = activities.filter(a => {
          const activityDate = new Date(a.created_at);
          return activityDate >= dayStart && activityDate <= dayEnd;
        });

        trends.push({
          date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          turbo: dayActivities.filter(a => a.activity_type === 'turbo_mode_used').length,
          expert: dayActivities.filter(a => a.activity_type === 'expert_marketplace_clicked').length,
          folders: dayActivities.filter(a => a.activity_type === 'folder_created').length,
          team: dayActivities.filter(a => a.activity_type === 'team_member_invited').length
        });
      }

      setDailyTrends(trends);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const featureData = [
    { name: 'Turbo Mode', value: turboStats.used, color: '#FCD34D' },
    { name: 'Expert Clicks', value: expertStats.clicks, color: '#60A5FA' },
    { name: 'Folders', value: folderStats.foldersCreated, color: '#34D399' },
    { name: 'Team Invites', value: teamStats.invites, color: '#F87171' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Monetization Analytics</h1>
        <p className="text-muted-foreground">Track adoption and usage of premium features</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turbo Mode</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{turboStats.adoptionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {turboStats.used} of {turboStats.total} audits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expert CTR</CardTitle>
            <MousePointer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expertStats.ctr}%</div>
            <p className="text-xs text-muted-foreground">
              {expertStats.clicks} clicks / {expertStats.impressions} views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Activity</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              {teamStats.invites} invites sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folder Usage</CardTitle>
            <FolderOpen className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folderStats.avgPerFolder}</div>
            <p className="text-xs text-muted-foreground">
              avg chats per folder ({folderStats.foldersCreated} folders)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Adoption Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Adoption (Last 30 Days)</CardTitle>
            <CardDescription>Total usage by feature</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={featureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {featureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Feature Usage</CardTitle>
            <CardDescription>Last 7 days activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="turbo" stroke="#FCD34D" name="Turbo" />
                <Line type="monotone" dataKey="expert" stroke="#60A5FA" name="Expert" />
                <Line type="monotone" dataKey="folders" stroke="#34D399" name="Folders" />
                <Line type="monotone" dataKey="team" stroke="#F87171" name="Team" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Turbo Mode Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Turbo Audits:</span>
              <span className="font-semibold">{turboStats.used}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Audits:</span>
              <span className="font-semibold">{turboStats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adoption Rate:</span>
              <span className="font-semibold text-yellow-600">{turboStats.adoptionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Collaboration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organizations:</span>
              <span className="font-semibold">{teamStats.organizations}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Members:</span>
              <span className="font-semibold">{teamStats.activeMembers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invites Sent:</span>
              <span className="font-semibold text-green-600">{teamStats.invites}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
