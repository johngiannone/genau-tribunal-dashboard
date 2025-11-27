import { useState, useEffect } from "react";
import { Cpu, Eye, CheckCircle, Copy, Check, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface ConsensusMessageProps {
  userPrompt: string;
  modelAResponse?: string;
  modelBResponse?: string;
  synthesisResponse?: string;
  confidenceScore?: number;
  isLoading?: boolean;
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
}: ConsensusMessageProps) => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DraftBox
            title="MODEL_A"
            subtitle="Llama 3"
            content={modelAResponse}
            isLoading={isLoading}
            animationDelay="0s"
          />
          <DraftBox
            title="MODEL_B"
            subtitle="Claude 3.5"
            content={modelBResponse}
            isLoading={isLoading}
            animationDelay="0.2s"
          />
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
          {/* Header with Confidence Bar */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-synthesis-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-foreground font-semibold font-mono text-xs">FINAL_OUTPUT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">DeepSeek R1</span>
              </div>
            </div>
            {!isLoading && synthesisResponse && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Confidence Score</span>
                  <span className="text-primary font-bold">{confidenceScore}%</span>
                </div>
                <Progress value={confidenceScore} className="h-1.5" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            {isLoading && !synthesisResponse ? (
              <div className="space-y-3">
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.2s' }} />
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.3s' }} />
                <div className="h-2 bg-muted/20 rounded animate-shimmer" style={{ animationDelay: '0.4s' }} />
                <div className="h-2 bg-muted/20 rounded w-4/5 animate-shimmer" style={{ animationDelay: '0.5s' }} />
              </div>
            ) : (
              <div className="space-y-4">
                {verdictSections.map((section, idx) => (
                  <div key={idx}>
                    {section.type === 'verdict' && (
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold text-primary mb-3 font-sans">
                          {section.title}
                        </h2>
                        <div className="text-foreground leading-[1.6] text-sm prose prose-invert max-w-none verdict-content">
                          <ReactMarkdown
                            components={{
                              code: CodeBlock,
                              p: ({ children }) => <p className="mb-3">{children}</p>,
                              ul: ({ children }) => <ul className="ml-5 mb-3 list-disc space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="ml-5 mb-3 list-decimal space-y-1">{children}</ol>,
                              strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                            }}
                          >
                            {section.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                    {section.type === 'alert' && (
                      <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-bold text-destructive mb-2 text-sm">
                              {section.title}
                            </h3>
                            <div className="text-foreground/90 leading-[1.6] text-sm prose prose-invert max-w-none">
                              <ReactMarkdown
                                components={{
                                  code: CodeBlock,
                                  p: ({ children }) => <p className="mb-3">{children}</p>,
                                  ul: ({ children }) => <ul className="ml-5 mb-3 list-disc space-y-1">{children}</ul>,
                                  ol: ({ children }) => <ol className="ml-5 mb-3 list-decimal space-y-1">{children}</ol>,
                                  strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                                }}
                              >
                                {section.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {section.type === 'text' && (
                      <div className="text-foreground leading-[1.6] text-sm prose prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            code: CodeBlock,
                            p: ({ children }) => <p className="mb-3">{children}</p>,
                            ul: ({ children }) => <ul className="ml-5 mb-3 list-disc space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="ml-5 mb-3 list-decimal space-y-1">{children}</ol>,
                            strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                          }}
                        >
                          {section.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
