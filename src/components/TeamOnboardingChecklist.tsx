import { useState, useEffect } from "react";
import { X, CheckCircle2, Circle, UserPlus, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
}

interface TeamOnboardingChecklistProps {
  hasMembersInvited: boolean;
  hasDocumentsUploaded: boolean;
  hasSharedAudits: boolean;
  onInviteClick: () => void;
  onDocumentsClick: () => void;
  onCreateAuditClick: () => void;
}

export const TeamOnboardingChecklist = ({
  hasMembersInvited,
  hasDocumentsUploaded,
  hasSharedAudits,
  onInviteClick,
  onDocumentsClick,
  onCreateAuditClick,
}: TeamOnboardingChecklistProps) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the checklist
    const isDismissed = localStorage.getItem("team_onboarding_dismissed");
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("team_onboarding_dismissed", "true");
    setDismissed(true);
  };

  const items: ChecklistItem[] = [
    {
      id: "invite",
      title: "Invite your first team member",
      description: "Collaborate by sending an invitation email",
      completed: hasMembersInvited,
      icon: <UserPlus className="w-5 h-5" />,
    },
    {
      id: "documents",
      title: "Upload knowledge base documents",
      description: "Share industry guidelines and company docs",
      completed: hasDocumentsUploaded,
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: "audit",
      title: "Run your first shared audit",
      description: "Create an audit visible to all team members",
      completed: hasSharedAudits,
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  // Don't show if dismissed or all completed
  if (dismissed || allCompleted) {
    return null;
  }

  const getActionForItem = (id: string) => {
    switch (id) {
      case "invite":
        return onInviteClick;
      case "documents":
        return onDocumentsClick;
      case "audit":
        return onCreateAuditClick;
      default:
        return () => {};
    }
  };

  return (
    <Card className="border-[#0071E3]/20 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="relative">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-[#86868B] hover:text-[#111111] transition-colors"
          aria-label="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0071E3] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl text-[#111111]">Welcome to Your Team!</CardTitle>
            <CardDescription>
              Get started with these essential steps ({completedCount}/{items.length} completed)
            </CardDescription>
          </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border-2 transition-all ${
              item.completed
                ? "border-green-200 bg-green-50/50"
                : "border-[#E5E5EA] bg-white hover:border-[#0071E3]/30"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 mt-0.5 ${
                  item.completed ? "text-green-600" : "text-[#86868B]"
                }`}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`${
                      item.completed ? "text-green-600" : "text-[#0071E3]"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <h3
                    className={`font-semibold ${
                      item.completed
                        ? "text-green-900 line-through"
                        : "text-[#111111]"
                    }`}
                  >
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm text-[#86868B] mt-1">{item.description}</p>
                {!item.completed && (
                  <Button
                    onClick={getActionForItem(item.id)}
                    variant="outline"
                    size="sm"
                    className="mt-3 text-[#0071E3] border-[#0071E3] hover:bg-[#0071E3] hover:text-white"
                  >
                    {item.id === "invite" && "Invite Member"}
                    {item.id === "documents" && "Upload Documents"}
                    {item.id === "audit" && "Create Audit"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
