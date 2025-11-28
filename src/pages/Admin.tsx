import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Loader2, ArrowLeft, Ban } from "lucide-react";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { ActivityStatsDashboard } from "@/components/ActivityStatsDashboard";
import { PriceSyncPanel } from "@/components/PriceSyncPanel";
import { CostAlertsPanel } from "@/components/CostAlertsPanel";
import { CostForecastPanel } from "@/components/CostForecastPanel";
import { CostBreakdownPanel } from "@/components/CostBreakdownPanel";
import { SecurityLogsPanel } from "@/components/SecurityLogsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface UserData {
  user_id: string;
  audit_count: number;
  audits_this_month: number;
  files_this_month: number;
  is_premium: boolean;
  subscription_tier: string | null;
  daily_cost_threshold: number | null;
  per_audit_cost_threshold: number | null;
  monthly_budget_limit: number | null;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Unauthorized access");
      navigate("/app");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<UserData>) => {
    try {
      const { error } = await supabase
        .from('user_usage')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success("User updated successfully");
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user");
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Main Content Area */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/app")}
                className="text-[#86868B] hover:text-[#0071E3]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Shield className="w-8 h-8 text-[#0071E3]" />
              <h1 className="text-4xl font-bold text-[#111111]">
                Admin Panel
              </h1>
            </div>

            {/* Tabs for different sections */}
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="bg-[#F9FAFB] border border-[#E5E5EA]">
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="logs">Activity Logs</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
                <TabsTrigger value="pricing">AI Pricing</TabsTrigger>
                <TabsTrigger value="forecast">Forecast</TabsTrigger>
                <TabsTrigger value="alerts">Cost Alerts</TabsTrigger>
                <TabsTrigger value="reports">Cost Reports</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <div className="rounded-2xl border border-[#E5E5EA] bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="font-semibold text-[#111111]">User ID</TableHead>
                <TableHead className="font-semibold text-[#111111]">Status</TableHead>
                <TableHead className="font-semibold text-[#111111]">Total Audits</TableHead>
                <TableHead className="font-semibold text-[#111111]">This Month</TableHead>
                <TableHead className="font-semibold text-[#111111]">Premium</TableHead>
                <TableHead className="font-semibold text-[#111111]">Tier</TableHead>
                <TableHead className="font-semibold text-[#111111]">Daily $</TableHead>
                <TableHead className="font-semibold text-[#111111]">Audit $</TableHead>
                <TableHead className="font-semibold text-[#111111]">Budget $</TableHead>
                <TableHead className="font-semibold text-[#111111]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id} className={user.is_banned ? "bg-red-50" : ""}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {user.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="h-3 w-3" />
                        Banned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.audit_count}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={user.audits_this_month || 0}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        setUsers(users.map(u => 
                          u.user_id === user.user_id 
                            ? { ...u, audits_this_month: newValue }
                            : u
                        ));
                      }}
                      onBlur={() => updateUser(user.user_id, { 
                        audits_this_month: user.audits_this_month 
                      })}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.is_premium}
                      onCheckedChange={(checked) => 
                        updateUser(user.user_id, { is_premium: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.subscription_tier || "free"}
                      onValueChange={(value) => 
                        updateUser(user.user_id, { subscription_tier: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="max">Max</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="agency">Agency</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={user.daily_cost_threshold || ''}
                      onChange={(e) => {
                        const newValue = e.target.value ? parseFloat(e.target.value) : null;
                        setUsers(users.map(u => 
                          u.user_id === user.user_id 
                            ? { ...u, daily_cost_threshold: newValue }
                            : u
                        ));
                      }}
                      onBlur={() => updateUser(user.user_id, { 
                        daily_cost_threshold: user.daily_cost_threshold 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={user.per_audit_cost_threshold || ''}
                      onChange={(e) => {
                        const newValue = e.target.value ? parseFloat(e.target.value) : null;
                        setUsers(users.map(u => 
                          u.user_id === user.user_id 
                            ? { ...u, per_audit_cost_threshold: newValue }
                            : u
                        ));
                      }}
                      onBlur={() => updateUser(user.user_id, { 
                        per_audit_cost_threshold: user.per_audit_cost_threshold 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      placeholder="0.00"
                      value={user.monthly_budget_limit || ''}
                      onChange={(e) => {
                        const newValue = e.target.value ? parseFloat(e.target.value) : null;
                        setUsers(users.map(u => 
                          u.user_id === user.user_id 
                            ? { ...u, monthly_budget_limit: newValue }
                            : u
                        ));
                      }}
                      onBlur={() => updateUser(user.user_id, { 
                        monthly_budget_limit: user.monthly_budget_limit 
                      })}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateUser(user.user_id, {
                        audits_this_month: (user.audits_this_month || 0) + 50
                      })}
                    >
                      +50 Audits
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="logs">
        <ActivityLogTable />
      </TabsContent>

      <TabsContent value="stats">
        <ActivityStatsDashboard />
      </TabsContent>

      <TabsContent value="pricing">
        <PriceSyncPanel />
      </TabsContent>

      <TabsContent value="forecast">
        <CostForecastPanel />
      </TabsContent>

      <TabsContent value="alerts">
        <CostAlertsPanel />
      </TabsContent>

      <TabsContent value="reports">
        <CostBreakdownPanel />
      </TabsContent>

      <TabsContent value="security">
        <SecurityLogsPanel />
      </TabsContent>
    </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Live Activity Feed */}
        <aside className="w-96 border-l border-[#E5E5EA] bg-[#F9FAFB] p-6 sticky top-0 h-screen overflow-y-auto">
          <LiveActivityFeed />
        </aside>
      </div>
    </div>
  );
};

export default Admin;
