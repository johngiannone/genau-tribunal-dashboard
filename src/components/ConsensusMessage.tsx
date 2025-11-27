import { useState, useEffect } from "react";
import { Cpu, Eye, CheckCircle } from "lucide-react";

interface ConsensusMessageProps {
  userPrompt: string;
  modelAResponse?: string;
  modelBResponse?: string;
  synthesisResponse?: string;
  confidenceScore?: number;
  isLoading?: boolean;
}

export const ConsensusMessage = ({
  userPrompt,
  modelAResponse,
  modelBResponse,
  synthesisResponse,
  confidenceScore = 99,
  isLoading = false,
}: ConsensusMessageProps) => {
  const [showModelA, setShowModelA] = useState(false);
  const [showModelB, setShowModelB] = useState(false);
  const [showSynthesis, setShowSynthesis] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer1 = setTimeout(() => setShowModelA(true), 200);
      const timer2 = setTimeout(() => setShowModelB(true), 400);
      const timer3 = setTimeout(() => setShowSynthesis(true), 600);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isLoading]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* User Prompt */}
      <div className="flex justify-end">
        <div className="max-w-2xl bg-accent border border-border rounded px-5 py-3">
          <p className="text-foreground leading-relaxed text-sm">{userPrompt}</p>
        </div>
      </div>

      {/* Model Outputs - Terminal Style */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
            Model Outputs
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Model A */}
          <div className="bg-model-a border border-border rounded overflow-hidden font-mono text-xs">
            <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-foreground font-semibold">MODEL_A</span>
              </div>
              <span className="text-muted-foreground text-[10px]">Llama 3</span>
            </div>
            <div className="p-4">
              {isLoading && !modelAResponse ? (
                <div className="space-y-2">
                  <div className="h-2 bg-muted/20 rounded animate-shimmer" />
                  <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
                  <div className="h-2 bg-muted/20 rounded w-3/4 animate-shimmer" style={{ animationDelay: '0.2s' }} />
                </div>
              ) : (
                <p className="text-foreground/90 leading-relaxed">
                  {modelAResponse || "Processing..."}
                </p>
              )}
            </div>
          </div>

          {/* Model B */}
          <div className="bg-model-b border border-border rounded overflow-hidden font-mono text-xs">
            <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="text-foreground font-semibold">MODEL_B</span>
              </div>
              <span className="text-muted-foreground text-[10px]">Claude 3.5</span>
            </div>
            <div className="p-4">
              {isLoading && !modelBResponse ? (
                <div className="space-y-2">
                  <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
                  <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.25s' }} />
                  <div className="h-2 bg-muted/20 rounded w-2/3 animate-shimmer" style={{ animationDelay: '0.35s' }} />
                </div>
              ) : (
                <p className="text-foreground/90 leading-relaxed">
                  {modelBResponse || "Processing..."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* The Synthesis - Final Output Console */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
            Synthesis
          </h3>
        </div>
        <div className="bg-card border border-synthesis-border rounded overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-2.5 border-b border-synthesis-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-foreground font-semibold font-mono text-xs">FINAL_OUTPUT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">DeepSeek R1</span>
              {!isLoading && synthesisResponse && (
                <div className="bg-confidence-bg text-confidence-fg px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                  {confidenceScore}% CONFIDENCE
                </div>
              )}
            </div>
          </div>
          <div className="p-5">
            {isLoading && !synthesisResponse ? (
              <div className="space-y-3">
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.2s' }} />
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.3s' }} />
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.4s' }} />
                <div className="h-2 bg-muted/20 rounded w-4/5 animate-shimmer" style={{ animationDelay: '0.5s' }} />
              </div>
            ) : (
              <p className="text-foreground leading-relaxed text-sm">
                {synthesisResponse || "Generating synthesis..."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
