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
import { Shield, Loader2 } from "lucide-react";

interface UserData {
  user_id: string;
  audit_count: number;
  audits_this_month: number;
  files_this_month: number;
  is_premium: boolean;
  subscription_tier: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error("Unauthorized access");
      navigate("/");
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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-mono font-bold gradient-text">
            Admin Panel
          </h1>
        </div>

        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">User ID</TableHead>
                <TableHead className="font-mono">Total Audits</TableHead>
                <TableHead className="font-mono">This Month</TableHead>
                <TableHead className="font-mono">Files/Month</TableHead>
                <TableHead className="font-mono">Premium</TableHead>
                <TableHead className="font-mono">Tier</TableHead>
                <TableHead className="font-mono">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {user.user_id.slice(0, 8)}...
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
                    <Input
                      type="number"
                      value={user.files_this_month || 0}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value) || 0;
                        setUsers(users.map(u => 
                          u.user_id === user.user_id 
                            ? { ...u, files_this_month: newValue }
                            : u
                        ));
                      }}
                      onBlur={() => updateUser(user.user_id, { 
                        files_this_month: user.files_this_month 
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
      </div>
    </div>
  );
};

export default Admin;
