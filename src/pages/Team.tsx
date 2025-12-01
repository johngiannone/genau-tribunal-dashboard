import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Users, UserPlus, History, Mail } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TeamKnowledgeBase from "@/components/TeamKnowledgeBase";
import { TeamOnboardingChecklist } from "@/components/TeamOnboardingChecklist";
import { useUserRole } from "@/hooks/useUserRole";

interface Organization {
  id: string;
  name: string;
  industry: string | null;
  subscription_tier: string | null;
}

interface Member {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string | null;
  invite_status: string | null;
  invited_at: string | null;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Team() {
  const navigate = useNavigate();
  const { lang } = useParams();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sharedAudits, setSharedAudits] = useState<Conversation[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [documentsCount, setDocumentsCount] = useState(0);
  const { canCreateTeam, loading: roleLoading } = useUserRole();

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(`/${lang || 'en'}/auth`);
        return;
      }

      // Fetch user's organization
      const { data: usage } = await supabase
        .from("user_usage")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!usage?.organization_id) {
        // Check if user can create teams (Team/Agency tier or admin)
        // If they can, redirect to setup-team; otherwise show message and go to app
        if (canCreateTeam) {
          toast.info("Set up your team to get started");
          navigate(`/${lang || 'en'}/setup-team`);
        } else {
          toast.error("You haven't been invited to a team yet");
          navigate(`/${lang || 'en'}/app`);
        }
        return;
      }

      // Fetch organization details
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", usage.organization_id)
        .single();

      setOrganization(org);

      // Fetch team members
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("*")
        .eq("organization_id", usage.organization_id)
        .order("invited_at", { ascending: false });

      setMembers(teamMembers || []);

      // Fetch shared audit history
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("organization_id", usage.organization_id)
        .order("updated_at", { ascending: false })
        .limit(20);

      setSharedAudits(conversations || []);

      // Fetch organization knowledge base documents count
      const { count } = await supabase
        .from("organization_knowledge_base")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", usage.organization_id)
        .eq("is_active", true);

      setDocumentsCount(count || 0);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !organization) return;

    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke("invite-team-member", {
        body: {
          organizationId: organization.id,
          email: inviteEmail,
          role: inviteRole,
        },
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("member");
      await fetchTeamData(); // Refresh data to update onboarding checklist
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/${lang || 'en'}/app`)}
              className="text-[#86868B] hover:text-[#0071E3]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Building2 className="w-8 h-8 text-[#0071E3]" />
            <div>
              <h1 className="text-3xl font-bold text-[#111111]">{organization?.name}</h1>
              {organization?.industry && (
                <p className="text-sm text-[#86868B] capitalize">
                  {organization.industry} Industry
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={() => setInviteDialogOpen(true)}
            className="bg-[#0071E3] hover:bg-[#0077ED] text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </Button>
        </div>

        {/* Onboarding Checklist */}
        <TeamOnboardingChecklist
          hasMembersInvited={members.length > 0}
          hasDocumentsUploaded={documentsCount > 0}
          hasSharedAudits={sharedAudits.length > 0}
          onInviteClick={() => setInviteDialogOpen(true)}
          onDocumentsClick={() => {
            // Scroll to knowledge base section
            const kbSection = document.querySelector('[data-knowledge-base]');
            kbSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onCreateAuditClick={() => navigate(`/${lang || 'en'}/app`)}
        />

        {/* Team Members */}
        <Card className="border-[#E5E5EA]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#0071E3]" />
              <CardTitle className="text-xl text-[#111111]">Team Members</CardTitle>
            </div>
            <CardDescription>
              {members.length} {members.length === 1 ? "member" : "members"} in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB]">
                  <TableHead className="font-semibold text-[#111111]">Email</TableHead>
                  <TableHead className="font-semibold text-[#111111]">Role</TableHead>
                  <TableHead className="font-semibold text-[#111111]">Status</TableHead>
                  <TableHead className="font-semibold text-[#111111]">Invited</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#86868B]" />
                      {member.invited_email || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {member.role || "member"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.invite_status === "accepted" ? "default" : "secondary"}
                      >
                        {member.invite_status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-[#86868B]">
                      {member.invited_at ? formatDate(member.invited_at) : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <div data-knowledge-base>
          {organization && (
            <TeamKnowledgeBase 
              organizationId={organization.id}
              onDocumentsChange={fetchTeamData}
            />
          )}
        </div>

        {/* Shared Audit History */}
        <Card className="border-[#E5E5EA]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#0071E3]" />
              <CardTitle className="text-xl text-[#111111]">Shared Audit History</CardTitle>
            </div>
            <CardDescription>
              Recent audits visible to all team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sharedAudits.length === 0 ? (
              <p className="text-center py-8 text-[#86868B]">
                No shared audits yet. Create an audit to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="font-semibold text-[#111111]">Audit Title</TableHead>
                    <TableHead className="font-semibold text-[#111111]">Created</TableHead>
                    <TableHead className="font-semibold text-[#111111]">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sharedAudits.map((audit) => (
                    <TableRow
                      key={audit.id}
                      className="cursor-pointer hover:bg-[#F9FAFB]"
                      onClick={() => navigate(`/${lang || 'en'}/app?conversation=${audit.id}`)}
                    >
                      <TableCell className="font-medium text-[#111111]">
                        {audit.title}
                      </TableCell>
                      <TableCell className="text-sm text-[#86868B]">
                        {formatDate(audit.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-[#86868B]">
                        {formatDate(audit.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteMember}
              disabled={!inviteEmail.trim() || inviting}
              className="gap-2"
            >
              {inviting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
