import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ConsensusMessage } from "@/components/ConsensusMessage";
import { ChatInput } from "@/components/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap } from "lucide-react";

interface Message {
  id: number;
  userPrompt: string;
  modelAResponse?: string;
  modelBResponse?: string;
  synthesisResponse?: string;
  confidenceScore?: number;
  isLoading?: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = (userPrompt: string) => {
    const newMessage: Message = {
      id: Date.now(),
      userPrompt,
      isLoading: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsProcessing(true);

    // Simulate AI responses with delays
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                modelAResponse:
                  "Analysis complete. Structure validated against schema. Primary nodes identified with 94% confidence. Data integrity check passed. Cross-reference complete. Pattern matching successful across 3 validation layers.",
              }
            : msg
        )
      );
    }, 1200);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                modelBResponse:
                  "Secondary analysis confirms primary findings. Edge cases detected in nodes 4-7. Alternate interpretation suggests potential optimization in data flow. Validation metrics show 97% alignment with expected parameters. Minor discrepancies flagged for review.",
              }
            : msg
        )
      );
    }, 2000);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                synthesisResponse:
                  "Consensus achieved. Both models converge on structural validity with high confidence scores. Recommended action: Proceed with implementation. Edge cases identified by Model B have been reviewed and deemed non-critical for current scope. Overall system integrity: VERIFIED. Performance projections: Optimal. Risk level: Minimal. Authorization: GRANTED.",
                confidenceScore: 99,
                isLoading: false,
              }
            : msg
        )
      );
      setIsProcessing(false);
    }, 3500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {messages.length === 0 ? (
              <div className="relative flex flex-col items-center justify-center h-[calc(100vh-300px)] text-center">
                {/* Geometric Background Pattern */}
                <div className="geometric-grid" />
                <div className="geometric-mesh" />
                
                {/* Hero Content */}
                <div className="relative z-10">
                  <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text font-sans tracking-tight">
                    Ask once. Get the consensus.
                  </h1>
                  <p className="text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed text-base font-mono">
                    Running Llama 3, Claude 3.5, and GPT-4o in parallel for precision auditing.
                  </p>
                  
                  {/* Model Indicators */}
                  <div className="flex flex-wrap justify-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded border border-border">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-foreground/80">LLAMA_3</span>
                    </div>
                    <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded border border-border">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="text-foreground/80">CLAUDE_3.5</span>
                    </div>
                    <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded border border-border">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                      <span className="text-foreground/80">GPT_4o</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {messages.map((message) => (
                  <ConsensusMessage
                    key={message.id}
                    userPrompt={message.userPrompt}
                    modelAResponse={message.modelAResponse}
                    modelBResponse={message.modelBResponse}
                    synthesisResponse={message.synthesisResponse}
                    confidenceScore={message.confidenceScore}
                    isLoading={message.isLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <ChatInput onSend={handleSendMessage} disabled={isProcessing} />
      </div>
    </div>
  );
};

export default Index;
