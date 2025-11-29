import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Loader2, ArrowLeft, Ban, Mail } from "lucide-react";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { ActivityStatsDashboard } from "@/components/ActivityStatsDashboard";
import { PriceSyncPanel } from "@/components/PriceSyncPanel";
import { BillingTransactionsPanel } from "@/components/BillingTransactionsPanel";
import { CostAlertsPanel } from "@/components/CostAlertsPanel";
import { CostForecastPanel } from "@/components/CostForecastPanel";
import { CostBreakdownPanel } from "@/components/CostBreakdownPanel";
import { RevenueForecastChart } from "@/components/RevenueForecastChart";
import { SecurityLogsPanel } from "@/components/SecurityLogsPanel";
import { BlockedIPsPanel } from "@/components/BlockedIPsPanel";
import { VPNDetectionAnalytics } from "@/components/VPNDetectionAnalytics";
import { SecurityMapWidget } from "@/components/SecurityMapWidget";
import { UnauthorizedAccessPanel } from "@/components/UnauthorizedAccessPanel";
import { EmailLogsPanel } from "@/components/EmailLogsPanel";
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
  account_status: 'active' | 'inactive' | 'disabled';
}

const Admin = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userEmail: string;
    newStatus: 'active' | 'inactive' | 'disabled';
    previousStatus: 'active' | 'inactive' | 'disabled';
  } | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [statusChangeMessage, setStatusChangeMessage] = useState("");
  const [emailUser, setEmailUser] = useState<{ userId: string; email: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

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
      
      // Log activity if account_status was changed
      if (updates.account_status) {
        const { data: { user: currentAdmin } } = await supabase.auth.getUser();
        
        await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            activity_type: 'admin_change',
            description: `Account status changed to ${updates.account_status}`,
            metadata: {
              previous_status: users.find(u => u.user_id === userId)?.account_status,
              new_status: updates.account_status,
              changed_by: currentAdmin?.id,
              changed_by_email: currentAdmin?.email,
              reason: statusChangeReason || undefined,
              custom_message: statusChangeMessage || undefined,
            }
          });
      }
      
      toast.success("User updated successfully");
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error("Failed to update user");
    }
  };

  const handleStatusChange = (userId: string, newStatus: 'active' | 'inactive' | 'disabled') => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    // Get user email from user_id (we'll need to fetch this from auth.users via admin query)
    // For now, we'll use a placeholder
    const userEmail = `${userId.slice(0, 8)}@user.email`; // This should be fetched properly

    setStatusChangeDialog({
      isOpen: true,
      userId,
      userEmail,
      newStatus,
      previousStatus: user.account_status,
    });
  };

  const confirmStatusChange = async () => {
    if (!statusChangeDialog) return;

    const { userId, userEmail, newStatus, previousStatus } = statusChangeDialog;

    try {
      // Update the user status
      await updateUser(userId, { account_status: newStatus });

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke('send-account-status-email', {
        body: {
          userId,
          userEmail,
          newStatus,
          previousStatus,
          reason: statusChangeReason || undefined,
          customMessage: statusChangeMessage || undefined,
        }
      });

      if (emailError) {
        console.error('Error sending status change email:', emailError);
        toast.error("Status updated but email notification failed");
      } else {
        toast.success("Status updated and notification sent");
      }

      // Reset dialog state
      setStatusChangeDialog(null);
      setStatusChangeReason("");
      setStatusChangeMessage("");
    } catch (error) {
      console.error('Error in status change flow:', error);
      toast.error("Failed to update status");
    }
  };

  const sendStatusEmail = async (userId: string, userEmail: string) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('send-account-status-email', {
        body: {
          userId,
          userEmail,
          newStatus: user.account_status,
          previousStatus: user.account_status,
          reason: "Manual status notification",
          customMessage: statusChangeMessage || undefined,
        }
      });

      if (error) throw error;

      toast.success("Email notification sent successfully");
      setEmailUser(null);
      setStatusChangeMessage("");
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error("Failed to send email notification");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
                <TabsTrigger value="billing">Billing Dashboard</TabsTrigger>
                <TabsTrigger value="logs">Activity Logs</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
                <TabsTrigger value="pricing">AI Pricing</TabsTrigger>
                <TabsTrigger value="forecast">Forecast</TabsTrigger>
                <TabsTrigger value="alerts">Cost Alerts</TabsTrigger>
                <TabsTrigger value="reports">Cost Reports</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="emails">Email History</TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <div className="rounded-2xl border border-[#E5E5EA] bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="font-semibold text-[#111111]">User ID</TableHead>
                <TableHead className="font-semibold text-[#111111]">Account Status</TableHead>
                <TableHead className="font-semibold text-[#111111]">Ban Status</TableHead>
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
                    <div className="flex items-center gap-2">
                      <Select
                        value={user.account_status}
                        onValueChange={(value) => 
                          handleStatusChange(user.user_id, value as 'active' | 'inactive' | 'disabled')
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white z-50">
                          <SelectItem value="active">
                            <span className="text-green-600 font-medium">Active</span>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <span className="text-yellow-600 font-medium">Inactive</span>
                          </SelectItem>
                          <SelectItem value="disabled">
                            <span className="text-red-600 font-medium">Disabled</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEmailUser({ userId: user.user_id, email: `${user.user_id.slice(0, 8)}@user.email` })}
                        className="h-8 w-8"
                        title="Send status notification email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_banned ? (
                      <Badge variant="destructive" className="gap-1">
                        <Ban className="h-3 w-3" />
                        Banned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600 border-gray-300">
                        Not Banned
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
                      <SelectContent className="bg-white z-50">
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

      <TabsContent value="billing">
        <div className="space-y-6">
          <CostAlertsPanel />
          
          <RevenueForecastChart />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostBreakdownPanel />
            <CostForecastPanel />
          </div>
          
          <PriceSyncPanel />
          
          <BillingTransactionsPanel />
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
        <div className="space-y-6">
          <SecurityMapWidget />
          <VPNDetectionAnalytics />
          <UnauthorizedAccessPanel />
          <BlockedIPsPanel />
          <SecurityLogsPanel />
        </div>
      </TabsContent>

      <TabsContent value="emails">
        <EmailLogsPanel />
      </TabsContent>
    </Tabs>
          </div>
        </div>

        {/* Right Sidebar - Live Activity Feed */}
        <aside className="w-96 border-l border-[#E5E5EA] bg-[#F9FAFB] p-6 sticky top-0 h-screen overflow-y-auto">
          <LiveActivityFeed />
        </aside>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialog?.isOpen || false} onOpenChange={(open) => {
        if (!open) {
          setStatusChangeDialog(null);
          setStatusChangeReason("");
          setStatusChangeMessage("");
        }
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Change Account Status</DialogTitle>
            <DialogDescription>
              Send a notification email to the user explaining the status change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status Change</Label>
              <div className="text-sm text-[#86868B]">
                {statusChangeDialog?.previousStatus} → <strong>{statusChangeDialog?.newStatus}</strong>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Policy violation, Account verification required"
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                className="border-[#E5E5EA]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add any additional information for the user..."
                value={statusChangeMessage}
                onChange={(e) => setStatusChangeMessage(e.target.value)}
                rows={4}
                className="border-[#E5E5EA] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusChangeDialog(null);
                setStatusChangeReason("");
                setStatusChangeMessage("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmStatusChange} className="gap-2">
              <Mail className="h-4 w-4" />
              Update & Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Email Dialog */}
      <Dialog open={emailUser !== null} onOpenChange={(open) => {
        if (!open) {
          setEmailUser(null);
          setStatusChangeMessage("");
        }
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Send Status Notification Email</DialogTitle>
            <DialogDescription>
              Send a notification email about the current account status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-message">Custom Message (Optional)</Label>
              <Textarea
                id="email-message"
                placeholder="Add any additional information for the user..."
                value={statusChangeMessage}
                onChange={(e) => setStatusChangeMessage(e.target.value)}
                rows={4}
                className="border-[#E5E5EA] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmailUser(null);
                setStatusChangeMessage("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => emailUser && sendStatusEmail(emailUser.userId, emailUser.email)}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
