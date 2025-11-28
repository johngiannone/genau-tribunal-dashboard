import { useState, useEffect } from "react";
import { Cpu, Eye, CheckCircle, Copy, Check, ChevronDown, ChevronUp, AlertCircle, ThumbsUp, ThumbsDown, Share2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ConsensusMessageProps {
  userPrompt: string;
  modelAResponse?: string;
  modelBResponse?: string;
  synthesisResponse?: string;
  confidenceScore?: number;
  isLoading?: boolean;
  modelAName?: string;
  modelBName?: string;
  messageId?: string;
  onRatingChange?: (messageId: string, rating: number) => void;
  currentRating?: number;
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
}

const DraftBox = ({ title, subtitle, content, isLoading, animationDelay = "0s" }: DraftBoxProps) => {
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
    <div className="bg-card border border-border rounded overflow-hidden font-mono text-xs">
      <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full bg-primary animate-pulse" 
            style={{ animationDelay }}
          />
          <span className="text-foreground font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[10px]">{subtitle}</span>
          {!isLoading && content && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>
      <div className={`p-4 ${needsExpansion && !expanded ? 'max-h-[300px] overflow-hidden relative' : ''}`}>
        {isLoading && !content ? (
          <div className="space-y-2">
            <div className="h-2 bg-muted/20 rounded animate-shimmer" />
            <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.1s' }} />
            <div className="h-2 bg-muted/20 rounded w-3/4 animate-shimmer" style={{ animationDelay: '0.2s' }} />
          </div>
        ) : (
          <>
            <div className="text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none draft-content">
              <ReactMarkdown
                components={{
                  code: CodeBlock,
                  p: ({ children }) => <p className="mb-3 leading-[1.6]">{children}</p>,
                  ul: ({ children }) => <ul className="ml-5 mb-3 list-disc space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="ml-5 mb-3 list-decimal space-y-1">{children}</ol>,
                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                }}
              >
                {content || "Processing..."}
              </ReactMarkdown>
            </div>
            {needsExpansion && !expanded && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card to-transparent" />
            )}
          </>
        )}
      </div>
      {needsExpansion && (
        <div className="border-t border-border px-4 py-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-mono"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show More
              </>
            )}
          </Button>
        </div>
      )}
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
  messageId,
  onRatingChange,
  currentRating = 0,
}: ConsensusMessageProps) => {
  const [isSharing, setIsSharing] = useState(false);
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

  const verdictSections = synthesisResponse ? parseVerdictSections(synthesisResponse) : [];

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
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-500 ${synthesisResponse && !isLoading ? 'opacity-40' : 'opacity-100'}`}>
          <DraftBox
            title={getModelDisplayName(modelAName)}
            subtitle={modelAName}
            content={modelAResponse}
            isLoading={isLoading}
            animationDelay="0s"
          />
          <DraftBox
            title={getModelDisplayName(modelBName)}
            subtitle={modelBName}
            content={modelBResponse}
            isLoading={isLoading}
            animationDelay="0.2s"
          />
        </div>
      </div>

      {/* The Synthesis - Report Card */}
      <div className="space-y-2">
        <div className="bg-card border border-synthesis-border rounded-lg overflow-hidden">
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
              <div className="bg-gradient-to-r from-gold/10 to-gold/5 px-8 py-6 border-b border-gold/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-4xl font-bold text-gold mb-2 font-sans">
                      The Council's Verdict
                    </h2>
                    <p className="text-muted-foreground text-sm font-mono">Final synthesis from {modelAName.split('/')[1]?.toUpperCase()}, {modelBName.split('/')[1]?.toUpperCase()}, and DeepSeek R1</p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-24 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: confidenceScore },
                              { value: 100 - confidenceScore }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={40}
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

              {/* Structured Findings Grid */}
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-4 font-mono uppercase tracking-wide">Findings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Consensus/Conflict Card */}
                    {modelAResponse && modelBResponse && (
                      <div className={`border rounded-lg p-4 ${
                        modelAResponse.substring(0, 100) === modelBResponse.substring(0, 100)
                          ? 'border-consensus-green/50 bg-consensus-green/5'
                          : 'border-conflict-yellow/50 bg-conflict-yellow/5'
                      }`}>
                        <div className="flex items-start gap-3">
                          {modelAResponse.substring(0, 100) === modelBResponse.substring(0, 100) ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-consensus-green flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-consensus-green mb-1">Consensus Reached</h4>
                                <p className="text-sm text-foreground/80">All models aligned on core recommendations</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-conflict-yellow flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-conflict-yellow mb-1">Conflict Detected</h4>
                                <p className="text-sm text-foreground/80">Models presented differing perspectives</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Critique Card */}
                    <div className="border border-primary/30 bg-primary/5 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Eye className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-primary mb-1">Analysis Complete</h4>
                          <p className="text-sm text-foreground/80">Synthesis incorporates all viewpoints</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Critiques */}
                  {verdictSections.some(s => s.type === 'alert') && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide font-mono">Key Critiques</h4>
                      {verdictSections
                        .filter(s => s.type === 'alert')
                        .map((section, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-foreground/90 leading-relaxed">{section.content.trim()}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* The Final Answer - Gold Box */}
                <div className="border-2 border-gold/40 bg-gold/5 rounded-lg overflow-hidden">
                  <div className="bg-gold/10 px-4 py-2 border-b border-gold/30 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gold uppercase tracking-wide font-mono">The Final Answer</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gold hover:text-gold hover:bg-gold/10"
                      onClick={() => {
                        navigator.clipboard.writeText(synthesisResponse);
                        toast({ title: "Copied to clipboard" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="p-6">
                    <div className="text-foreground leading-[1.8] prose prose-invert max-w-none font-serif text-base">
                      <ReactMarkdown
                        components={{
                          code: CodeBlock,
                          p: ({ children }) => <p className="mb-4 font-serif">{children}</p>,
                          ul: ({ children }) => <ul className="ml-6 mb-4 list-disc space-y-2">{children}</ul>,
                          ol: ({ children }) => <ol className="ml-6 mb-4 list-decimal space-y-2">{children}</ol>,
                          strong: ({ children }) => <strong className="font-bold text-gold">{children}</strong>,
                          h1: ({ children }) => <h1 className="text-2xl font-bold text-gold mb-4 font-serif">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-bold text-gold mb-3 font-serif">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-bold text-gold mb-2 font-serif">{children}</h3>,
                        }}
                      >
                        {synthesisResponse}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Buttons */}
              <div className="border-t border-border px-8 py-4 flex items-center justify-between gap-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  {messageId && onRatingChange && (
                    <>
                      <span className="text-xs text-muted-foreground font-mono mr-2">Rate this verdict:</span>
                      <Button
                        size="sm"
                        variant={currentRating === 1 ? "default" : "outline"}
                        onClick={() => onRatingChange(messageId, currentRating === 1 ? 0 : 1)}
                        className="gap-2"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Good
                      </Button>
                      <Button
                        size="sm"
                        variant={currentRating === -1 ? "destructive" : "outline"}
                        onClick={() => onRatingChange(messageId, currentRating === -1 ? 0 : -1)}
                        className="gap-2"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        Bad
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
                  {isSharing ? "Generating..." : "Share"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
