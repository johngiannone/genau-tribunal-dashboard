import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ConsensusMessage } from "@/components/ConsensusMessage";
import { ChatInput } from "@/components/ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [statusText, setStatusText] = useState("");
  const { toast } = useToast();

  const handleSendMessage = async (userPrompt: string) => {
    const newMessage: Message = {
      id: Date.now(),
      userPrompt,
      isLoading: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsProcessing(true);
    setStatusText("Initializing Council...");

    try {
      // Call the chat-consensus edge function
      const { data, error } = await supabase.functions.invoke('chat-consensus', {
        body: { prompt: userPrompt }
      });

      if (error) {
        throw error;
      }

      // Update message with all responses
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id
            ? {
                ...msg,
                modelAResponse: data.draftA,
                modelBResponse: data.draftB,
                synthesisResponse: data.verdict,
                confidenceScore: 99,
                isLoading: false,
              }
            : msg
        )
      );
      setStatusText("");
    } catch (error) {
      console.error("Error calling chat-consensus:", error);
      
      // Remove the failed message
      setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
      
      // Show error toast
      toast({
        title: "Connection Error",
        description: "Failed to reach the consensus engine. Please try again.",
        variant: "destructive",
      });
      
      setStatusText("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-5xl mx-auto px-6 py-8 pb-32">
            {/* Status Text */}
            {statusText && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary/10 backdrop-blur-sm border border-primary/30 text-primary px-4 py-2 rounded-full text-xs font-mono animate-pulse">
                {statusText}
              </div>
            )}
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
                    Running Llama 3, Claude 3.5, and DeepSeek R1 in parallel for precision auditing.
                  </p>
                  
                  {/* System Status Bar */}
                  <div className="inline-flex items-center gap-4 bg-card/70 backdrop-blur-sm px-6 py-3 rounded-full border border-border/50 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-foreground/80">LLAMA_3</span>
                    </div>
                    <div className="h-4 w-px bg-border/50" />
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.3s' }} />
                      <span className="text-foreground/80">CLAUDE_3.5</span>
                    </div>
                    <div className="h-4 w-px bg-border/50" />
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.6s' }} />
                      <span className="text-foreground/80">DEEPSEEK_R1</span>
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
