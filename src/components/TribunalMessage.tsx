import { useState, useEffect } from "react";

interface TribunalMessageProps {
  userPrompt: string;
  chairmanResponse?: string;
  criticResponse?: string;
  auditorVerdict?: string;
  isLoading?: boolean;
}

export const TribunalMessage = ({
  userPrompt,
  chairmanResponse,
  criticResponse,
  auditorVerdict,
  isLoading = false,
}: TribunalMessageProps) => {
  const [showChairman, setShowChairman] = useState(false);
  const [showCritic, setShowCritic] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer1 = setTimeout(() => setShowChairman(true), 300);
      const timer2 = setTimeout(() => setShowCritic(true), 600);
      const timer3 = setTimeout(() => setShowVerdict(true), 900);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isLoading]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* User Prompt */}
      <div className="flex justify-end">
        <div className="max-w-2xl bg-accent/50 rounded-2xl px-6 py-4 border border-border">
          <p className="text-foreground leading-relaxed">{userPrompt}</p>
        </div>
      </div>

      {/* The Drafts - Two Column Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          The Drafts
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Chairman Column */}
          <div className="bg-draft-chairman rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>🤖</span>
                <span>The Chairman</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">GPT-4o</p>
            </div>
            <div className="p-4">
              {isLoading && !chairmanResponse ? (
                <div className="space-y-3">
                  <div className="h-3 bg-muted/30 rounded animate-shimmer" />
                  <div className="h-3 bg-muted/30 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
                  <div className="h-3 bg-muted/30 rounded w-3/4 animate-shimmer" style={{ animationDelay: '0.2s' }} />
                </div>
              ) : (
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {chairmanResponse || "Analyzing..."}
                </p>
              )}
            </div>
          </div>

          {/* Critic Column */}
          <div className="bg-draft-critic rounded-xl border border-border overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span>🐯</span>
                <span>The Critic</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">Claude 3.5</p>
            </div>
            <div className="p-4">
              {isLoading && !criticResponse ? (
                <div className="space-y-3">
                  <div className="h-3 bg-muted/30 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
                  <div className="h-3 bg-muted/30 rounded animate-shimmer" style={{ animationDelay: '0.25s' }} />
                  <div className="h-3 bg-muted/30 rounded w-2/3 animate-shimmer" style={{ animationDelay: '0.35s' }} />
                </div>
              ) : (
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {criticResponse || "Analyzing..."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The Verdict */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          The Verdict
        </h3>
        <div className="bg-card rounded-xl border border-verdict-border overflow-hidden shadow-lg shadow-primary/5">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-verdict-border/50">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>⚖️</span>
              <span>The Auditor</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">DeepSeek R1</p>
          </div>
          <div className="p-6">
            {isLoading && !auditorVerdict ? (
              <div className="space-y-4">
                <div className="h-3 bg-muted/30 rounded animate-shimmer" style={{ animationDelay: '0.2s' }} />
                <div className="h-3 bg-muted/30 rounded animate-shimmer" style={{ animationDelay: '0.3s' }} />
                <div className="h-3 bg-muted/30 rounded animate-shimmer" style={{ animationDelay: '0.4s' }} />
                <div className="h-3 bg-muted/30 rounded w-5/6 animate-shimmer" style={{ animationDelay: '0.5s' }} />
              </div>
            ) : (
              <p className="text-foreground leading-relaxed">
                {auditorVerdict || "Synthesizing final verdict..."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
