import { useState, useEffect } from "react";
import { Cpu, Eye, CheckCircle, Copy, Check, ChevronDown, ChevronUp, AlertCircle, ThumbsUp, ThumbsDown, Share2, X, RefreshCw, Download, Mail } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ModelMarketModal } from "./ModelMarketModal";
import { exportVerdictToPDF } from "@/lib/pdfExport";
import { EmailShareModal } from "./EmailShareModal";
import { useIsPro } from "@/hooks/useIsPro";
import { UpgradeModal } from "./UpgradeModal";

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
    <div className={`bg-white border border-[#E5E5EA] rounded-2xl shadow-sm transition-all duration-300 ${isDimmed ? 'opacity-50' : 'opacity-100'}`}>
      <div className="bg-[#F5F5F7] px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-[#0071E3]" />
          <div>
            <h3 className="text-sm font-semibold text-[#111111]">
              {agentName ? `${agentName}` : title}
            </h3>
            <p className="text-xs text-[#86868B]">{subtitle}</p>
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
            <div className="h-3 bg-[#F5F5F7] rounded-full w-full animate-pulse" style={{ animationDelay }}></div>
            <div className="h-3 bg-[#F5F5F7] rounded-full w-5/6 animate-pulse" style={{ animationDelay }}></div>
            <div className="h-3 bg-[#F5F5F7] rounded-full w-4/6 animate-pulse" style={{ animationDelay }}></div>
          </div>
        ) : (
          <div className={`prose prose-sm max-w-none ${needsExpansion && !expanded ? 'max-h-[300px] overflow-hidden relative' : ''}`}>
            <div className="text-sm text-[#111111] leading-relaxed">
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
            className="mt-4 text-xs text-[#0071E3] hover:text-[#0071E3]/80 font-medium flex items-center gap-1 transition-colors"
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
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  const { isPro } = useIsPro();

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
        {/* User Prompt - Dark bubble with white text */}
        <div className="flex justify-end">
          <div className="max-w-3xl bg-[#1D1D1F] text-white px-6 py-4 rounded-2xl shadow-sm">
            <p className="leading-relaxed">{userPrompt}</p>
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
          <h3 className="text-sm font-semibold text-[#86868B] uppercase tracking-wide px-1">
            Synthesis
          </h3>
          <div className="bg-white border-2 border-[#0071E3]/20 rounded-2xl shadow-sm overflow-hidden">
          {isLoading && !synthesisResponse ? (
            <div className="p-8">
              <div className="space-y-3">
                <div className="h-2 bg-[#F5F5F7] rounded animate-shimmer" style={{ animationDelay: '0.2s' }} />
                <div className="h-2 bg-[#F5F5F7] rounded animate-shimmer" style={{ animationDelay: '0.3s' }} />
                <div className="h-2 bg-[#F5F5F7] rounded animate-shimmer" style={{ animationDelay: '0.4s' }} />
                <div className="h-2 bg-[#F5F5F7] rounded w-4/5 animate-shimmer" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          ) : synthesisResponse ? (
            <>
              {/* Verdict Header */}
              <div className="bg-white px-8 py-8 border-b border-[#E5E5EA]">
                <div className="flex items-center justify-between gap-8">
                  <div className="flex-1">
                    <h2 className="text-5xl font-black text-[#111111] mb-3 font-serif tracking-tight">
                      The Council's Verdict
                    </h2>
                    <p className="text-[#86868B] text-base leading-relaxed">Comprehensive multi-model analysis</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="relative w-28 h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Confidence', value: confidenceScore },
                              { name: 'Remaining', value: 100 - confidenceScore }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={50}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            <Cell fill="#22c55e" />
                            <Cell fill="#f3f4f6" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-[#111111]">{confidenceScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Structured Content */}
              <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-[#111111] mb-5">Key Findings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Consensus/Conflict Card */}
                    {modelAResponse && modelBResponse && (
                      <div className={`border rounded-xl p-6 ${
                        modelAResponse.substring(0, 100) === modelBResponse.substring(0, 100)
                          ? 'border-green-200 bg-green-50'
                          : 'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex items-start gap-4">
                          {modelAResponse.substring(0, 100) === modelBResponse.substring(0, 100) ? (
                            <>
                              <CheckCircle className="w-7 h-7 text-green-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-[#111111] mb-2 text-base">Consensus Reached</h4>
                                <p className="text-sm text-[#111111]/70 leading-relaxed">Models demonstrated strong alignment on key recommendations and analysis.</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-7 h-7 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h4 className="font-bold text-[#111111] mb-2 text-base">Conflict Detected</h4>
                                <p className="text-sm text-[#111111]/70 leading-relaxed">Models provided different perspectives requiring careful synthesis.</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Analysis Card */}
                    <div className="border border-[#0071E3] bg-[#0071E3]/5 rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <Eye className="w-7 h-7 text-[#0071E3] flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold text-[#111111] mb-2 text-base">Analysis Complete</h4>
                          <p className="text-sm text-[#111111]/70 leading-relaxed">All council viewpoints have been thoroughly synthesized and validated.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* The Synthesized Response - Gold Final Answer Box */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#111111] font-serif">Final Synthesis</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (synthesisResponse) {
                            navigator.clipboard.writeText(synthesisResponse);
                            toast({ title: "Copied to clipboard" });
                          }
                        }}
                        className="h-8"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!isPro) {
                            setShowUpgradeModal(true);
                            return;
                          }
                          if (synthesisResponse) {
                            exportVerdictToPDF({
                              verdict: synthesisResponse,
                              confidence: confidenceScore,
                              userPrompt: userPrompt,
                              drafts: [
                                { agentName: agentNameA || modelAName, role: modelAName, content: modelAResponse || '' },
                                { agentName: agentNameB || modelBName, role: modelBName, content: modelBResponse || '' }
                              ],
                              timestamp: new Date().toLocaleString()
                            });
                            toast({ title: "PDF report downloaded" });
                          }
                        }}
                        className="h-8"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmailModal(true)}
                        className="h-8"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </div>
                  <div className="text-[#111111] leading-[1.7] prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        code: CodeBlock,
                        p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-[#1D1D1F]">{children}</strong>,
                        ul: ({ children }) => <ul className="space-y-2 my-4">{children}</ul>,
                        li: ({ children }) => (
                          <li className="flex items-start gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0071E3] mt-2 flex-shrink-0" />
                            <span className="flex-1">{children}</span>
                          </li>
                        ),
                      }}
                    >
                      {synthesisResponse}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="border-t border-[#E5E5EA] px-8 py-6 flex items-center justify-between gap-4 bg-[#F5F5F7]/50">
                <div className="flex items-center gap-3">
                  {messageId && onRatingChange && (
                    <>
                      <span className="text-sm text-[#86868B]">Rate this synthesis:</span>
                      <Button
                        size="sm"
                        variant={currentRating === 1 ? "default" : "outline"}
                        onClick={() => onRatingChange(messageId, currentRating === 1 ? 0 : 1)}
                        className="gap-2 rounded-full"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Helpful
                      </Button>
                      <Button
                        size="sm"
                        variant={currentRating === -1 ? "destructive" : "outline"}
                        onClick={() => onRatingChange(messageId, currentRating === -1 ? 0 : -1)}
                        className="gap-2 rounded-full"
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
                  className="gap-2 rounded-full"
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
      
      {/* Email Share Modal */}
      <EmailShareModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        userPrompt={userPrompt}
        verdict={synthesisResponse || ""}
        confidence={confidenceScore}
        modelAResponse={modelAResponse}
        modelBResponse={modelBResponse}
        agentNameA={agentNameA}
        agentNameB={agentNameB}
        modelAName={modelAName}
        modelBName={modelBName}
      />
      
      {/* Upgrade Modal */}
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </>
  );
};
