import { useState, useEffect } from "react";
import { Cpu, Eye, CheckCircle, Copy, Check, ChevronDown, ChevronUp, AlertCircle, ThumbsUp, ThumbsDown, Share2, X, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ModelMarketModal } from "./ModelMarketModal";

interface ConsensusMessageProps {
  userPrompt: string;
  modelAResponse?: string;
  modelBResponse?: string;
  synthesisResponse?: string;
  confidenceScore?: number;
  isLoading?: boolean;
  modelAName?: string;
  modelBName?: string;
  agentNameA?: string;
  agentNameB?: string;
  messageId?: string;
  onRatingChange?: (messageId: string, rating: number) => void;
  currentRating?: number;
  onModelSwap?: (slot: 'slot_1' | 'slot_2', modelId: string, modelName: string) => void;
  currentModelAId?: string;
  currentModelBId?: string;
}

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return !inline && match ? (
    <div className="relative group my-4">
      <Button
        size="sm"
        variant="ghost"
        className="absolute right-2 top-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
        }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  ) : (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  );
};

interface DraftBoxProps {
  title: string;
  subtitle: string;
  content?: string;
  isLoading: boolean;
  animationDelay?: string;
  agentName?: string;
  onChangeModel?: () => void;
  isDimmed?: boolean;
}

const DraftBox = ({ title, subtitle, content, isLoading, animationDelay = "0s", agentName, onChangeModel, isDimmed }: DraftBoxProps) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const needsExpansion = content && content.length > 800;

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`apple-card bg-card transition-all duration-300 ${isDimmed ? 'opacity-50' : 'opacity-100'}`}>
      <div className="bg-secondary px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {agentName ? `${agentName}` : title}
            </h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onChangeModel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onChangeModel}
              className="h-8 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Swap
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="px-6 py-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-3 bg-secondary rounded-full w-full animate-pulse" style={{ animationDelay }}></div>
            <div className="h-3 bg-secondary rounded-full w-5/6 animate-pulse" style={{ animationDelay }}></div>
            <div className="h-3 bg-secondary rounded-full w-4/6 animate-pulse" style={{ animationDelay }}></div>
          </div>
        ) : (
          <div className={`prose prose-sm max-w-none ${needsExpansion && !expanded ? 'max-h-[300px] overflow-hidden relative' : ''}`}>
            <div className="text-sm text-foreground leading-relaxed">
              <ReactMarkdown
                components={{
                  code: CodeBlock,
                }}
              >
                {content || "No response"}
              </ReactMarkdown>
            </div>
            {needsExpansion && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent"></div>
            )}
          </div>
        )}
        {needsExpansion && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" /> Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" /> Show More
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const parseVerdictSections = (text: string) => {
  const sections: { type: 'verdict' | 'alert' | 'text'; content: string; title?: string }[] = [];
  
  // Split by major headers
  const lines = text.split('\n');
  let currentSection: { type: 'verdict' | 'alert' | 'text'; content: string; title?: string } = { 
    type: 'text', 
    content: '' 
  };
  
  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();
    
    // Check for Verdict header
    if (lowerLine.includes('verdict:') || lowerLine.includes('**verdict:**')) {
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      currentSection = { type: 'verdict', content: '', title: 'Verdict' };
      return;
    }
    
    // Check for Error/Correction headers
    if (lowerLine.includes('error') || lowerLine.includes('correction') || lowerLine.includes('issue')) {
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      const title = line.replace(/[*:#]/g, '').trim();
      currentSection = { type: 'alert', content: '', title };
      return;
    }
    
    currentSection.content += line + '\n';
  });
  
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  return sections.length > 0 ? sections : [{ type: 'text' as 'text', content: text, title: undefined }];
};

export const ConsensusMessage = ({
  userPrompt,
  modelAResponse,
  modelBResponse,
  synthesisResponse,
  confidenceScore = 99,
  isLoading = false,
  modelAName = "Model A",
  modelBName = "Model B",
  agentNameA,
  agentNameB,
  messageId,
  onRatingChange,
  currentRating = 0,
  onModelSwap,
  currentModelAId,
  currentModelBId,
}: ConsensusMessageProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showModelMarket, setShowModelMarket] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<'slot_1' | 'slot_2' | null>(null);
  const { toast } = useToast();

  const getModelDisplayName = (modelId: string) => {
    if (modelId === "Model A" || modelId === "Model B") return modelId;
    return modelId.split('/')[1]?.replace(/-/g, ' ').toUpperCase() || modelId;
  };

  const generateSlug = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < 8; i++) {
      slug += chars[Math.floor(Math.random() * chars.length)];
    }
    return slug;
  };

  const handleShare = async () => {
    if (!modelAResponse || !modelBResponse || !synthesisResponse) {
      toast({
        title: "Cannot share incomplete audit",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      const slug = generateSlug();
      const { data: session } = await supabase.auth.getSession();

      const { error } = await supabase
        .from('public_shares')
        .insert({
          share_slug: slug,
          user_prompt: userPrompt,
          model_a_name: modelAName,
          model_a_response: modelAResponse,
          model_b_name: modelBName,
          model_b_response: modelBResponse,
          synthesis: synthesisResponse,
          confidence: confidenceScore,
          created_by: session.session?.user.id || null,
        });

      if (error) {
        console.error("Error creating share:", error);
        toast({
          title: "Failed to create share link",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      const shareUrl = `${window.location.origin}/share/${slug}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share link copied!",
        description: "Anyone with this link can view this audit",
      });
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Failed to create share link",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleChangeModelClick = (slot: 'slot_1' | 'slot_2') => {
    setSelectedSlot(slot);
    setShowModelMarket(true);
  };

  const handleModelSelect = async (modelId: string, modelName?: string) => {
    if (!selectedSlot || !onModelSwap || !modelName) return;
    
    onModelSwap(selectedSlot, modelId, modelName);
    setShowModelMarket(false);
    setSelectedSlot(null);
    
    toast({
      title: "Model swapped",
      description: `${selectedSlot === 'slot_1' ? 'Model A' : 'Model B'} updated to ${modelName}. Future messages will use this model.`,
    });
  };

  const verdictSections = synthesisResponse ? parseVerdictSections(synthesisResponse) : [];

  return (
    <>
      <div className="space-y-8 animate-fadeIn">
        {/* User Prompt */}
        <div className="flex justify-end">
          <div className="max-w-3xl apple-card bg-secondary px-6 py-4">
            <p className="text-foreground leading-relaxed">{userPrompt}</p>
          </div>
        </div>

        {/* Model Outputs */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Model Responses
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DraftBox
              title={getModelDisplayName(modelAName)}
              subtitle={modelAName}
              content={modelAResponse}
              isLoading={isLoading}
              animationDelay="0s"
              agentName={agentNameA}
              onChangeModel={onModelSwap ? () => handleChangeModelClick('slot_1') : undefined}
              isDimmed={synthesisResponse && !isLoading}
            />
            <DraftBox
              title={getModelDisplayName(modelBName)}
              subtitle={modelBName}
              content={modelBResponse}
              isLoading={isLoading}
              animationDelay="0.2s"
              agentName={agentNameB}
              onChangeModel={onModelSwap ? () => handleChangeModelClick('slot_2') : undefined}
              isDimmed={synthesisResponse && !isLoading}
            />
          </div>
        </div>

        {/* The Synthesis */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Synthesis
          </h3>
          <div className="apple-card bg-card border-2 border-primary/20 overflow-hidden">
          {isLoading && !synthesisResponse ? (
            <div className="p-8">
              <div className="space-y-3">
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.2s' }} />
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.3s' }} />
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.4s' }} />
                <div className="h-2 bg-muted/20 rounded w-4/5 animate-shimmer" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          ) : synthesisResponse ? (
            <>
              {/* Verdict Header */}
              <div className="bg-secondary px-8 py-8 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-4xl font-bold text-foreground mb-2">
                      Synthesis
                    </h2>
                    <p className="text-muted-foreground text-sm">AI Council Analysis</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-20 h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: confidenceScore },
                              { value: 100 - confidenceScore }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={26}
                            outerRadius={36}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            <Cell fill="hsl(var(--gold))" />
                            <Cell fill="hsl(var(--muted))" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gold">{confidenceScore}%</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Confidence</span>
                  </div>
                </div>
              </div>

              {/* Structured Content */}
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Key Findings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Consensus/Conflict Card */}
                    {modelAResponse && modelBResponse && (
                      <div className={`apple-card p-5 ${
                        modelAResponse.substring(0, 100) === modelBResponse.substring(0, 100)
                          ? 'bg-success/5 border-success/20'
                          : 'bg-warning/5 border-warning/20'
                      }`}>
                        <div className="flex items-start gap-3">
                          {modelAResponse.substring(0, 100) === modelBResponse.substring(0, 100) ? (
                            <>
                              <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-foreground mb-1">Consensus</h4>
                                <p className="text-sm text-muted-foreground">Models aligned on recommendations</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-6 h-6 text-warning flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-foreground mb-1">Different Views</h4>
                                <p className="text-sm text-muted-foreground">Models offered varied perspectives</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Analysis Card */}
                    <div className="apple-card p-5 bg-primary/5 border-primary/20">
                      <div className="flex items-start gap-3">
                        <Eye className="w-6 h-6 text-primary flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Complete</h4>
                          <p className="text-sm text-muted-foreground">All viewpoints synthesized</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The Synthesized Response */}
                <div className="apple-card p-8 bg-card">
                  <div className="text-foreground leading-relaxed prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        code: CodeBlock,
                      }}
                    >
                      {synthesisResponse}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="border-t border-border px-8 py-6 flex items-center justify-between gap-4 bg-secondary/50">
                <div className="flex items-center gap-3">
                  {messageId && onRatingChange && (
                    <>
                      <span className="text-sm text-muted-foreground">Rate this synthesis:</span>
                      <Button
                        size="sm"
                        variant={currentRating === 1 ? "default" : "outline"}
                        onClick={() => onRatingChange(messageId, currentRating === 1 ? 0 : 1)}
                        className="gap-2"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Helpful
                      </Button>
                      <Button
                        size="sm"
                        variant={currentRating === -1 ? "destructive" : "outline"}
                        onClick={() => onRatingChange(messageId, currentRating === -1 ? 0 : -1)}
                        className="gap-2"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        Not Helpful
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShare}
                  disabled={isSharing}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {isSharing ? "Creating..." : "Share"}
                </Button>
              </div>
            </>
          ) : null}
          </div>
        </div>
      </div>
      
      {/* Model Market Modal */}
      {onModelSwap && (
        <ModelMarketModal
          open={showModelMarket}
          onOpenChange={setShowModelMarket}
          onModelSelect={handleModelSelect}
          currentModel={selectedSlot === 'slot_1' ? currentModelAId : currentModelBId}
        />
      )}
    </>
  );
};
