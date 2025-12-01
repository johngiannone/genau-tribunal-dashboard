import { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, Circle, UserPlus, FileText, Sparkles, PartyPopper } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import confetti from "canvas-confetti";

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
  const [showCelebration, setShowCelebration] = useState(false);
  const previousCompletionRef = useRef(false);

  useEffect(() => {
    // Check if user has dismissed the checklist
    const isDismissed = localStorage.getItem("team_onboarding_dismissed");
    if (isDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  // Trigger confetti when all steps are completed
  useEffect(() => {
    const allCompleted = hasMembersInvited && hasDocumentsUploaded && hasSharedAudits;
    
    // Only trigger if this is a new completion (wasn't completed before)
    if (allCompleted && !previousCompletionRef.current) {
      triggerConfetti();
      setShowCelebration(true);
      
      // Auto-dismiss after celebration
      setTimeout(() => {
        handleDismiss();
      }, 5000);
    }
    
    previousCompletionRef.current = allCompleted;
  }, [hasMembersInvited, hasDocumentsUploaded, hasSharedAudits]);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#0071E3', '#34D399', '#FBBF24', '#F472B6', '#A78BFA'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#0071E3', '#34D399', '#FBBF24', '#F472B6', '#A78BFA'],
      });
    }, 250);
  };

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

  // Don't show if dismissed
  if (dismissed) {
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
    <Card className={`border-[#0071E3]/20 transition-all duration-500 ${
      showCelebration 
        ? 'bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 shadow-2xl animate-scale-in' 
        : 'bg-gradient-to-br from-blue-50 to-white'
    }`}>
      <CardHeader className="relative">
        {!showCelebration && (
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 text-[#86868B] hover:text-[#111111] transition-colors"
            aria-label="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
            showCelebration 
              ? 'bg-gradient-to-br from-green-500 to-emerald-600 animate-bounce' 
              : 'bg-[#0071E3]'
          }`}>
            {showCelebration ? (
              <PartyPopper className="w-5 h-5 text-white" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <CardTitle className={`text-xl transition-colors duration-500 ${
              showCelebration ? 'text-green-700' : 'text-[#111111]'
            }`}>
              {showCelebration ? '🎉 Congratulations!' : 'Welcome to Your Team!'}
            </CardTitle>
            <CardDescription>
              {showCelebration 
                ? "You've completed your team onboarding!" 
                : `Get started with these essential steps (${completedCount}/${items.length} completed)`
              }
            </CardDescription>
          </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>
      <CardContent className="space-y-3">
        {showCelebration && allCompleted ? (
          <div className="py-8 text-center space-y-4 animate-fade-in">
            <div className="text-6xl animate-bounce">🎊</div>
            <h3 className="text-2xl font-bold text-green-700">You're All Set!</h3>
            <p className="text-[#86868B] max-w-md mx-auto">
              Your team workspace is fully configured. You're ready to collaborate and create amazing audits together!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-[#86868B] mt-4">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>All onboarding steps completed</span>
            </div>
          </div>
        ) : (
          items.map((item) => (
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
        )))}
      </CardContent>
    </Card>
  );
};
