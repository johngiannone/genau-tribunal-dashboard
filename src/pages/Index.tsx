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
  trainingDatasetId?: string;
  humanRating?: number;
  agentNameA?: string;
  agentNameB?: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usage, setUsage] = useState<{ 
    audit_count: number; 
    is_premium: boolean;
    audits_this_month: number;
    subscription_tier: string | null;
  } | null>(null);
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
        } else if (window.location.pathname === "/") {
          navigate("/app");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else if (window.location.pathname === "/") {
        navigate("/app");
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

  // Refresh council config when window regains focus (after returning from settings)
  useEffect(() => {
    const handleFocus = () => {
      if (session?.user) {
        fetchCouncilConfig();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session]);

  const fetchCouncilConfig = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('council_config')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching council config:", error);
      return;
    }

    if (data?.council_config) {
      setCouncilConfig(data.council_config);
    } else {
      // Use default config if none exists
      setCouncilConfig({
        slot_1: "openai/gpt-4o",
        slot_2: "anthropic/claude-3.5-sonnet",
        slot_3: "qwen/qwen-2.5-coder-32b",
        slot_4: "xai/grok-beta",
        slot_5: "meta-llama/llama-3.3-70b",
      });
    }
  };

  const fetchUsage = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('user_usage')
      .select('audit_count, is_premium, audits_this_month, subscription_tier')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error("Error fetching usage:", error);
      return;
    }

    setUsage(data);
  };

  const updateCouncilSlot = async (slot: 'slot_1' | 'slot_2', modelId: string, modelName: string) => {
    if (!session?.user) return;

    const role = slot === 'slot_1' ? 'The Speedster' : 'The Critic';
    
    const updatedConfig = {
      ...councilConfig,
      [slot]: { id: modelId, name: modelName, role }
    };

    const { error } = await supabase
      .from('profiles')
      .update({ council_config: updatedConfig })
      .eq('id', session.user.id);

    if (error) {
      console.error("Error updating council config:", error);
      toast({
        title: "Failed to update model",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCouncilConfig(updatedConfig);
    }
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
    // Fetch messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error("Error loading messages:", messagesError);
      toast({
        title: "Error loading conversation",
        description: messagesError.message,
        variant: "destructive",
      });
      return;
    }

    // Fetch conversation context
    const { data: conversationData, error: conversationError } = await supabase
      .from('conversations')
      .select('context, title')
      .eq('id', conversationId)
      .maybeSingle();

    if (conversationError) {
      console.error("Error loading conversation context:", conversationError);
    }

    const loadedMessages: Message[] = messagesData.map((msg) => ({
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
    setHasContext(!!conversationData?.context);
    
    // Show feedback
    toast({
      title: messagesData.length === 0 ? "Empty conversation loaded" : "Conversation loaded",
      description: messagesData.length === 0 
        ? "No audits in this conversation yet" 
        : `${messagesData.length} message${messagesData.length === 1 ? '' : 's'} loaded`,
    });
  };

  const handleNewSession = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setHasContext(false);
  };

  const handleRatingChange = async (trainingDatasetId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('training_dataset')
        .update({ human_rating: rating })
        .eq('id', trainingDatasetId);

      if (error) {
        console.error('Error updating rating:', error);
        toast({
          title: "Failed to save rating",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Update local message state
        setMessages(prev => 
          prev.map(msg => 
            msg.trainingDatasetId === trainingDatasetId 
              ? { ...msg, humanRating: rating }
              : msg
          )
        );
        toast({
          title: rating === 1 ? "Marked as good" : rating === -1 ? "Marked as bad" : "Rating cleared",
        });
      }
    } catch (err) {
      console.error('Rating update error:', err);
      toast({
        title: "Failed to save rating",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (userPrompt: string, fileUrl?: string) => {
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    // Check usage limits before calling API
    const monthlyLimit = usage.subscription_tier === 'pro' ? 200 
      : usage.subscription_tier === 'max' ? 800
      : usage.subscription_tier === 'team' ? 1500
      : usage.subscription_tier === 'agency' ? 5000
      : 3; // Free tier: 3 per day

    if (usage && !usage.is_premium && (usage.audits_this_month || 0) >= monthlyLimit) {
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
        trainingDatasetId: data.trainingDatasetId,
        humanRating: 0,
        agentNameA: data.agentNameA,
        agentNameB: data.agentNameB,
        drafts: data.drafts || [] // Store the dynamic drafts array
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
    <div className="flex h-screen w-full overflow-hidden bg-white">
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
              <div className="relative flex flex-col items-center justify-center h-[calc(100vh-300px)] text-center p-12">
                {/* Hero Content */}
                <div className="relative z-10 max-w-4xl">
                  {currentConversationId ? (
                    <>
                      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#111111] tracking-tight">
                        Empty Conversation
                      </h1>
                      <p className="text-muted-foreground max-w-2xl mx-auto mb-8 leading-[1.6] text-lg">
                        This conversation has no completed audits yet. Send a message to start.
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-6xl md:text-7xl font-extrabold mb-8 text-[#111111] tracking-tight leading-[1.1]">
                        Ask once. Get the consensus.
                      </h1>
                      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16 leading-[1.6]">
                        Running multiple AI models in parallel for precision analysis
                      </p>
                    </>
                  )}
                  
                  {/* Only show usage and status when not in a loaded conversation */}
                  {!currentConversationId && (
                    <>
                      {/* Usage indicator */}
                      {usage && !usage.is_premium && (
                        <div className="mb-8">
                          <p className="text-sm text-muted-foreground">
                            {(() => {
                              const monthlyLimit = usage.subscription_tier === 'pro' ? 200 
                                : usage.subscription_tier === 'max' ? 800
                                : usage.subscription_tier === 'team' ? 1500
                                : usage.subscription_tier === 'agency' ? 5000
                                : 3; // Free tier: 3 per day
                              const remaining = monthlyLimit - (usage.audits_this_month || 0);
                              return `${remaining} free audits remaining this month`;
                            })()}
                          </p>
                        </div>
                      )}
                      
                      {/* Model Status Pills - Larger and more prominent */}
                      <div className="inline-flex items-center gap-3 bg-secondary/50 backdrop-blur-sm px-6 py-3 rounded-full border border-border shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          <span className="text-sm font-medium text-foreground">{councilConfig?.slot_1?.name || 'Llama 3'}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: '0.3s' }} />
                          <span className="text-sm font-medium text-foreground">{councilConfig?.slot_2?.name || 'Claude 3.5'}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: '0.6s' }} />
                          <span className="text-sm font-medium text-foreground">{councilConfig?.slot_3?.name || 'DeepSeek R1'}</span>
                        </div>
                      </div>
                    </>
                  )}
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
                    modelAName={councilConfig?.slot_1?.name || councilConfig?.slot_1 || "Model A"}
                    modelBName={councilConfig?.slot_2?.name || councilConfig?.slot_2 || "Model B"}
                    agentNameA={message.agentNameA || councilConfig?.slot_1?.role}
                    agentNameB={message.agentNameB || councilConfig?.slot_2?.role}
                    messageId={message.trainingDatasetId}
                    onRatingChange={handleRatingChange}
                    currentRating={message.humanRating}
                    onModelSwap={updateCouncilSlot}
                    currentModelAId={councilConfig?.slot_1?.id || councilConfig?.slot_1}
                    currentModelBId={councilConfig?.slot_2?.id || councilConfig?.slot_2}
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
