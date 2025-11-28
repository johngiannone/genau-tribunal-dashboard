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
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [hasContext, setHasContext] = useState(false);
  const [councilConfig, setCouncilConfig] = useState<any>(null);
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
      fetchCouncilConfig();
    }
  }, [session]);

  const fetchCouncilConfig = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('council_config')
      .eq('id', session.user.id)
      .maybeSingle();

    if (!error && data?.council_config) {
      setCouncilConfig(data.council_config);
    }
  };

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

  const createNewConversation = async (title: string) => {
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title,
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return null;
    }

    return data.id;
  };

  const saveMessage = async (conversationId: string, message: Message) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message.userPrompt,
        model_a_response: message.modelAResponse,
        model_b_response: message.modelBResponse,
        synthesis: message.synthesisResponse,
        confidence: message.confidenceScore,
      });

    if (error) {
      console.error("Error saving message:", error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error loading conversation:", error);
      return;
    }

    const loadedMessages: Message[] = data.map((msg) => ({
      id: Date.now() + Math.random(),
      userPrompt: msg.content,
      modelAResponse: msg.model_a_response || undefined,
      modelBResponse: msg.model_b_response || undefined,
      synthesisResponse: msg.synthesis || undefined,
      confidenceScore: msg.confidence || undefined,
      isLoading: false,
    }));

    setMessages(loadedMessages);
    setCurrentConversationId(conversationId);
  };

  const handleNewSession = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setHasContext(false);
  };

  const handleSendMessage = async (userPrompt: string, fileUrl?: string) => {
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    // Check usage limits before calling API
    if (usage && !usage.is_premium && usage.audit_count >= 5) {
      setShowUpgradeModal(true);
      return;
    }

    // Create conversation if this is the first message
    let conversationId = currentConversationId;
    if (!conversationId) {
      const title = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : '');
      conversationId = await createNewConversation(title);
      if (!conversationId) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }
      setCurrentConversationId(conversationId);
    }

    const newMessage: Message = {
      id: Date.now(),
      userPrompt,
      isLoading: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setIsProcessing(true);

    try {
      // Get current session token for authenticated request
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        throw new Error("Not authenticated");
      }

      // Set status based on whether file is provided
      if (fileUrl) {
        setStatusText("The Librarian is reading...");
      } else {
        setStatusText("Initializing Council...");
      }

      // Send to consensus with conversation context
      const { data, error } = await supabase.functions.invoke('chat-consensus', {
        body: { 
          prompt: userPrompt,
          fileUrl: fileUrl || null,
          conversationId: conversationId,
          councilConfig: councilConfig || null
        },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        
        // Check if it's a usage limit error
        if (error.message?.includes('Usage limit reached') || error.context?.limitReached) {
          setShowUpgradeModal(true);
          setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
          setStatusText("");
          setIsProcessing(false);
          return;
        }
        
        // Extract the actual error message
        const errorMessage = error.message || error.error || JSON.stringify(error);
        throw new Error(errorMessage);
      }

      // Update message with all responses
      const updatedMessage = {
        ...newMessage,
        modelAResponse: data.draftA,
        modelBResponse: data.draftB,
        synthesisResponse: data.verdict,
        confidenceScore: 99,
        isLoading: false,
      };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? updatedMessage : msg
        )
      );

      // Save librarian analysis to conversation context if new file was analyzed
      if (data.librarianAnalysis && conversationId) {
        console.log("Saving librarian analysis to conversation context");
        const { error: contextError } = await supabase
          .from('conversations')
          .update({ context: data.librarianAnalysis })
          .eq('id', conversationId);
        
        if (contextError) {
          console.error("Error saving context:", contextError);
        } else {
          setHasContext(true);
        }
      }

      // Save message to database
      if (conversationId) {
        await saveMessage(conversationId, updatedMessage);
      }
      
      // Refresh usage after successful audit
      fetchUsage();
      
      setStatusText("");
    } catch (error) {
      console.error("Error calling chat-consensus:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      
      // Remove the failed message
      setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
      
      // Show error toast with exact error message
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      
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
      <Sidebar 
        onNewSession={handleNewSession}
        onLoadConversation={loadConversation}
        currentConversationId={currentConversationId}
      />

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
                    modelAName={councilConfig?.slot_1 || "Model A"}
                    modelBName={councilConfig?.slot_2 || "Model B"}
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
