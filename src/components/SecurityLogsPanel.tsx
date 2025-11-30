import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Ban, Check } from "lucide-react";
import { formatRelativeTime } from "@/lib/intl-formatting";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type SecurityLog = Tables<"security_logs">;

interface UserBanStatus {
  user_id: string;
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
  violation_count: number;
}

interface UserSuspensionStatus {
  user_id: string;
  account_status: 'active' | 'inactive' | 'disabled';
  suspended_until: string | null;
  violation_count: number;
}

export const SecurityLogsPanel = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [bannedUsers, setBannedUsers] = useState<UserBanStatus[]>([]);
  const [suspendedUsers, setSuspendedUsers] = useState<UserSuspensionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityLogs();
    fetchBannedUsers();
    fetchSuspendedUsers();
    
    // Listen for new activity logs with ban/suspension notifications
    const channel = supabase
      .channel('ban-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: 'activity_type=eq.admin_change'
        },
        async (payload) => {
          const metadata = payload.new.metadata as any;
          
          // Check if this is an automated ban that needs email notification
          if (metadata?.automated && metadata?.send_email && payload.new.description?.includes('auto-banned')) {
            console.log("Sending ban notification email for user:", payload.new.user_id);
            
            // Send ban notification via edge function
            const { error } = await supabase.functions.invoke('send-ban-notification', {
              body: {
                userId: payload.new.user_id,
                banReason: metadata.ban_reason,
                violationCount: metadata.violation_count,
                violationCategories: metadata.violation_categories
              }
            });
            
            if (error) {
              console.error("Failed to send ban notification:", error);
            } else {
              console.log("Ban notification email sent successfully");
              toast.success("Ban notification email sent to user");
            }
            
            // Refresh banned users list
            fetchBannedUsers();
          }
          
          // Check if this is an automated suspension
          if (metadata?.reason === 'brute_force_prevention') {
            console.log("User suspended for brute force attempts:", payload.new.user_id);
            toast.info("User automatically suspended for repeated unauthorized access");
            fetchSuspendedUsers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSecurityLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("security_logs")
      .select("*")
      .order("flagged_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to fetch security logs:", error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const fetchBannedUsers = async () => {
    const { data, error } = await supabase
      .from("user_usage")
      .select("user_id, is_banned, banned_at, ban_reason")
      .eq("is_banned", true)
      .order("banned_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch banned users:", error);
      return;
    }

    // Get violation counts for each banned user
    const usersWithCounts = await Promise.all(
      (data || []).map(async (user) => {
        const { count } = await supabase
          .from("security_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id);

        return {
          ...user,
          violation_count: count || 0,
        };
      })
    );

    setBannedUsers(usersWithCounts);
  };

  const unbanUser = async (userId: string) => {
    const { error } = await supabase
      .from("user_usage")
      .update({
        is_banned: false,
        banned_at: null,
        ban_reason: null,
      })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to unban user");
      console.error(error);
      return;
    }

    // Log unban activity
    await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        activity_type: "admin_change",
        description: "User unbanned by administrator",
        metadata: {
          manual_unban: true
        }
      });

    toast.success("User unbanned successfully");
    fetchBannedUsers();
  };

  const fetchSuspendedUsers = async () => {
    const { data, error } = await supabase
      .from("user_usage")
      .select("user_id, account_status, suspended_until")
      .eq("account_status", "inactive")
      .not("suspended_until", "is", null)
      .order("suspended_until", { ascending: true });

    if (error) {
      console.error("Failed to fetch suspended users:", error);
      return;
    }

    // Get unauthorized access attempt counts for each suspended user
    const usersWithCounts = await Promise.all(
      (data || []).map(async (user) => {
        const { count } = await supabase
          .from("activity_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.user_id)
          .eq("activity_type", "unauthorized_access")
          .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Last 10 minutes

        return {
          ...user,
          violation_count: count || 0,
        };
      })
    );

    setSuspendedUsers(usersWithCounts);
  };

  const unsuspendUser = async (userId: string) => {
    const { error } = await supabase
      .from("user_usage")
      .update({
        account_status: "active",
        suspended_until: null,
      })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to unsuspend user");
      console.error(error);
      return;
    }

    // Log unsuspend activity
    await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        activity_type: "admin_change",
        description: "User suspension manually lifted by administrator",
        metadata: {
          manual_unsuspend: true
        }
      });

    toast.success("User suspension has been lifted");
    fetchSuspendedUsers();
  };

  const getCategoryBadgeColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("violence") || lowerCategory.includes("hate")) {
      return "destructive";
    }
    if (lowerCategory.includes("sexual")) {
      return "secondary";
    }
    return "default";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Violations
            </CardTitle>
            <CardDescription>Loading security data...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banned Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Banned Users
          </CardTitle>
          <CardDescription>
            Users automatically banned for repeated violations. {bannedUsers.length} currently banned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bannedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
              <p>No banned users</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Banned At</TableHead>
                    <TableHead>Violations</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bannedUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-mono text-xs">
                        {user.user_id.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.banned_at
                          ? formatRelativeTime(user.banned_at, { style: 'short' })
                          : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{user.violation_count} violations</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">
                          {user.ban_reason || "No reason provided"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unbanUser(user.user_id)}
                        >
                          Unban
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspended Users Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Temporarily Suspended Users
          </CardTitle>
          <CardDescription>
            Users temporarily suspended for repeated unauthorized access attempts. {suspendedUsers.length} currently suspended.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suspendedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
              <p>No suspended users</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Suspended Until</TableHead>
                    <TableHead>Failed Attempts</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspendedUsers.map((user) => {
                    const timeRemaining = user.suspended_until 
                      ? Math.ceil((new Date(user.suspended_until).getTime() - Date.now()) / 60000)
                      : 0;
                    const isExpired = timeRemaining <= 0;

                    return (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-mono text-xs">
                          {user.user_id.substring(0, 12)}...
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.suspended_until
                            ? formatRelativeTime(user.suspended_until, { style: 'short' })
                            : "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.violation_count} attempts</Badge>
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <Badge variant="outline" className="bg-green-50">Expired</Badge>
                          ) : (
                            <Badge variant="default">{timeRemaining} min</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unsuspendUser(user.user_id)}
                          >
                            Lift Suspension
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Violations Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Violations
          </CardTitle>
          <CardDescription>
            Content flagged by OpenAI moderation. {logs.length} violations logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No security violations detected</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Flagged Categories</TableHead>
                    <TableHead>Prompt Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {formatRelativeTime(log.flagged_at, { style: 'short' })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {log.flag_category.split(", ").map((cat) => (
                            <Badge
                              key={cat}
                              variant={getCategoryBadgeColor(cat) as any}
                              className="text-xs"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm truncate text-muted-foreground">
                          {log.prompt.substring(0, 100)}
                          {log.prompt.length > 100 && "..."}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
