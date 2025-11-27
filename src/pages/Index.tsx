import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ConsensusMessage } from "@/components/ConsensusMessage";
import { ChatInput } from "@/components/ChatInput";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

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
  const [session, setSession] = useState<Session | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usage, setUsage] = useState<{ audit_count: number; is_premium: boolean } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auth state management
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch usage when session is available
  useEffect(() => {
    if (session?.user) {
      fetchUsage();
    }
  }, [session]);

  const fetchUsage = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('user_usage')
      .select('audit_count, is_premium')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error("Error fetching usage:", error);
      return;
    }

    setUsage(data);
  };

  const handleSendMessage = async (userPrompt: string, imageData?: string) => {
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    // Check usage limits before calling API
    if (usage && !usage.is_premium && usage.audit_count >= 5) {
      setShowUpgradeModal(true);
      return;
    }

    const newMessage: Message = {
      id: Date.now(),
      userPrompt,
      isLoading: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsProcessing(true);
    setStatusText(
      imageData 
        ? "Sending Page 1 to Vision Engine..." 
        : "Initializing Council..."
    );

    try {
      // Get current session token for authenticated request
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        throw new Error("Not authenticated");
      }

      // Call the chat-consensus edge function with auth header
      const { data, error } = await supabase.functions.invoke('chat-consensus', {
        body: { prompt: userPrompt, image_data: imageData },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`
        }
      });

      if (error) {
        // Check if it's a usage limit error
        if (error.message?.includes('Usage limit reached') || error.context?.limitReached) {
          setShowUpgradeModal(true);
          setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
          setStatusText("");
          setIsProcessing(false);
          return;
        }
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
      
      // Refresh usage after successful audit
      fetchUsage();
      
      setStatusText("");
    } catch (error) {
      console.error("Error calling chat-consensus:", error);
      
      // Remove the failed message
      setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
      
      // Show error toast with exact error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Connection Error",
        description: `Error: ${errorMessage}`,
        variant: "destructive",
      });
      
      setStatusText("");
    } finally {
      setIsProcessing(false);
    }
  };

  // Show nothing while checking auth
  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Upgrade Modal */}
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      
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
                  
                  {/* Usage indicator */}
                  {usage && !usage.is_premium && (
                    <div className="mb-6">
                      <p className="text-sm text-muted-foreground">
                        {5 - usage.audit_count} free audits remaining today
                      </p>
                    </div>
                  )}
                  
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
