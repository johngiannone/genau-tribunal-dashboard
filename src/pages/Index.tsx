import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ConsensusMessage } from "@/components/ConsensusMessage";
import { ChatInput } from "@/components/ChatInput";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ModelRecommendationModal } from "@/components/ModelRecommendationModal";
import { ModelMarketModal } from "@/components/ModelMarketModal";
import { ABTestingNotificationBanner } from "@/components/ABTestingNotificationBanner";
import CostCalculator from "@/components/CostCalculator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useABTestingNotification } from "@/hooks/useABTestingNotification";
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
  draftARating?: number;
  draftBRating?: number;
  agentNameA?: string;
  agentNameB?: string;
  computeStats?: {
    totalTokens: number;
    estimatedCost: number;
    modelCount: number;
  };
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
    account_status: 'active' | 'inactive' | 'disabled';
    suspended_until?: string | null;
  } | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [hasContext, setHasContext] = useState(false);
  const [councilConfig, setCouncilConfig] = useState<any>(null);
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<{ prompt: string; fileUrl?: string } | null>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [enableRecommendations, setEnableRecommendations] = useState(true);
  const [usedRecommendation, setUsedRecommendation] = useState(false);
  const [selectedSlotForSwap, setSelectedSlotForSwap] = useState<'slot_1' | 'slot_2' | 'slot_3' | null>(null);
  const [showModelSwapModal, setShowModelSwapModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // A/B Testing notification hook
  const { showNotification, performanceData, dismissNotification } = useABTestingNotification(session);

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
      fetchPreferences();
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
      .select('audit_count, is_premium, audits_this_month, subscription_tier, account_status, suspended_until')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error("Error fetching usage:", error);
      return;
    }

    // Check if account is temporarily suspended
    if (data && data.account_status === 'inactive' && data.suspended_until) {
      const suspendedUntil = new Date(data.suspended_until);
      if (suspendedUntil > new Date()) {
        const minutes = Math.ceil((suspendedUntil.getTime() - Date.now()) / 60000);
        await supabase.auth.signOut();
        
        toast({
          title: "Account Suspended",
          description: `Your account is temporarily suspended due to repeated unauthorized access attempts. Try again in ${minutes} minutes.`,
          variant: "destructive",
        });
        
        navigate("/auth");
        return;
      }
    }

    // Check account status and sign out if disabled
    if (data && data.account_status === 'disabled') {
      await supabase.auth.signOut();
      
      toast({
        title: "Account Disabled",
        description: "Your account has been disabled. Please contact support.",
        variant: "destructive",
      });
      
      navigate("/auth");
      return;
    }

    setUsage(data);
  };

  const fetchPreferences = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('enable_model_recommendations')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching preferences:", error);
      return;
    }

    if (data) {
      setEnableRecommendations(data.enable_model_recommendations ?? true);
    }
  };

  const updateCouncilSlot = async (slot: 'slot_1' | 'slot_2' | 'slot_3', modelId: string, modelName: string) => {
    if (!session?.user) return;

    const role = slot === 'slot_1' ? 'The Speedster' 
                 : slot === 'slot_2' ? 'The Critic' 
                 : 'The Architect';
    
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
      toast({
        title: "Model updated",
        description: `${modelName} is now in position ${slot.split('_')[1]}`,
      });
    }
  };

  const handleModelSwapFromPill = (modelId: string, modelName: string) => {
    if (!selectedSlotForSwap) return;
    updateCouncilSlot(selectedSlotForSwap, modelId, modelName);
    setShowModelSwapModal(false);
    setSelectedSlotForSwap(null);
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
        .update({ verdict_rating: rating })
        .eq('id', trainingDatasetId);

      if (error) {
        console.error('Error updating verdict rating:', error);
        toast({
          title: "Failed to save rating",
          description: error.message,
          variant: "destructive",
        });
      } else {
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
  
  const handleDraftRating = async (trainingDatasetId: string, draft: 'a' | 'b', rating: number) => {
    try {
      const column = draft === 'a' ? 'draft_a_rating' : 'draft_b_rating';
      const { error } = await supabase
        .from('training_dataset')
        .update({ [column]: rating })
        .eq('id', trainingDatasetId);

      if (error) {
        console.error('Error updating draft rating:', error);
        toast({
          title: "Failed to save rating",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setMessages(prev => 
          prev.map(msg => 
            msg.trainingDatasetId === trainingDatasetId 
              ? { ...msg, [draft === 'a' ? 'draftARating' : 'draftBRating']: rating }
              : msg
          )
        );
        toast({
          title: rating === 1 ? "Marked as helpful" : rating === -1 ? "Marked as not helpful" : "Rating cleared",
        });
      }
    } catch (err) {
      console.error('Draft rating error:', err);
      toast({
        title: "Failed to save rating",
        variant: "destructive",
      });
    }
  };
  
  const handleRefineVerdict = async (originalVerdict: string, feedback: string) => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        throw new Error("Not authenticated");
      }

      // Get the auditor model from current council config (last slot)
      const auditorModel = councilConfig?.slot_6?.id || 'deepseek/deepseek-r1';

      const { data, error } = await supabase.functions.invoke('refine-verdict', {
        body: { 
          originalVerdict,
          userFeedback: feedback,
          auditorModel
        },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`
        }
      });

      if (error || !data?.refinedVerdict) {
        throw new Error(error?.message || 'Failed to refine verdict');
      }

      // Update the last message's synthesis with the refined verdict
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            synthesisResponse: data.refinedVerdict
          };
        }
        return updated;
      });

      toast({
        title: "Verdict refined",
        description: "The synthesis has been updated based on your feedback",
      });
    } catch (error) {
      console.error('Refine error:', error);
      toast({
        title: "Failed to refine verdict",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const fetchRecommendation = async (prompt: string) => {
    setIsLoadingRecommendation(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('recommend-models', {
        body: { prompt },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`
        }
      });

      if (error) {
        console.error("Recommendation error:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      return null;
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  const handleSendMessage = async (userPrompt: string, fileUrl?: string, emailWhenReady?: boolean) => {
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

    // Store pending prompt and fetch recommendation only if enabled
    setPendingPrompt({ prompt: userPrompt, fileUrl });
    
    if (enableRecommendations) {
      const rec = await fetchRecommendation(userPrompt);
      
      if (rec) {
        setRecommendation(rec);
        setShowRecommendationModal(true);
        return; // Wait for user to accept/decline
      }
    }

    // If recommendations disabled or no recommendation, proceed normally
    await executeAudit(userPrompt, fileUrl, null, emailWhenReady);
  };

  const executeAudit = async (userPrompt: string, fileUrl?: string, temporaryCouncil?: any, emailWhenReady?: boolean) => {

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

      // Send to consensus with conversation context (use temporary council if provided)
      const councilSource = temporaryCouncil ? 'recommended' : (councilConfig ? 'user_configured' : 'default');
      const { data, error } = await supabase.functions.invoke('chat-consensus', {
        body: { 
          prompt: userPrompt,
          fileUrl: fileUrl || null,
          conversationId: conversationId,
          councilConfig: temporaryCouncil || councilConfig || null,
          councilSource: councilSource,
          notifyByEmail: emailWhenReady || false
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
        
        // Check if account is disabled
        if (error.message?.includes('Account disabled') || error.context?.account_status === 'disabled') {
          toast({
            title: "Account Disabled",
            description: "Your account has been permanently disabled. Please contact support if you believe this is an error.",
            variant: "destructive",
          });
          setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
          setStatusText("");
          setIsProcessing(false);
          return;
        }
        
        // Check if account is inactive
        if (error.message?.includes('Account inactive') || error.context?.account_status === 'inactive') {
          toast({
            title: "Account Inactive",
            description: "Your account is currently inactive. Please contact support to reactivate your account.",
            variant: "destructive",
          });
          setMessages((prev) => prev.filter((msg) => msg.id !== newMessage.id));
          setStatusText("");
          setIsProcessing(false);
          return;
        }
        
        // Check if account is suspended/banned
        if (error.message?.includes('Account suspended')) {
          toast({
            title: "Account Suspended",
            description: error.context?.details || "Your account has been suspended. Contact support for assistance.",
            variant: "destructive",
          });
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
        draftARating: 0,
        draftBRating: 0,
        agentNameA: data.agentNameA,
        agentNameB: data.agentNameB,
        drafts: data.drafts || [],
        computeStats: data.computeStats
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
      
      {/* Model Recommendation Modal */}
      <ModelRecommendationModal
        isOpen={showRecommendationModal}
        onClose={() => {
          setShowRecommendationModal(false);
          setPendingPrompt(null);
          setRecommendation(null);
        }}
        recommendation={recommendation}
        onAccept={async () => {
          setShowRecommendationModal(false);
          if (pendingPrompt && recommendation) {
            // Build temporary council config from recommendations
            const tempCouncil = {
              slot_1: {
                id: recommendation.recommendations.drafters[0].id,
                name: recommendation.recommendations.drafters[0].name,
                role: recommendation.recommendations.drafters[0].role
              },
              slot_2: {
                id: recommendation.recommendations.drafters[1].id,
                name: recommendation.recommendations.drafters[1].name,
                role: recommendation.recommendations.drafters[1].role
              },
              slot_3: {
                id: recommendation.recommendations.drafters[2].id,
                name: recommendation.recommendations.drafters[2].name,
                role: recommendation.recommendations.drafters[2].role
              },
              slot_4: {
                id: recommendation.recommendations.auditor.id,
                name: recommendation.recommendations.auditor.name,
                role: recommendation.recommendations.auditor.role
              },
              slot_5: {
                id: recommendation.recommendations.auditor.id,
                name: recommendation.recommendations.auditor.name,
                role: recommendation.recommendations.auditor.role
              }
            };
            
            await executeAudit(pendingPrompt.prompt, pendingPrompt.fileUrl, tempCouncil);
            setPendingPrompt(null);
            setRecommendation(null);
          }
        }}
        onDecline={async () => {
          setShowRecommendationModal(false);
          if (pendingPrompt) {
            await executeAudit(pendingPrompt.prompt, pendingPrompt.fileUrl, null);
            setPendingPrompt(null);
            setRecommendation(null);
          }
        }}
        isLoading={isProcessing}
      />
      
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
                      
                      {/* Model Status Pills - Clickable for model swapping */}
                      <div className="inline-flex items-center gap-3 bg-secondary/50 backdrop-blur-sm px-6 py-3 rounded-full border border-border shadow-sm">
                        <button
                          onClick={() => {
                            setSelectedSlotForSwap('slot_1');
                            setShowModelSwapModal(true);
                          }}
                          className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform"
                          title="Click to change model"
                        >
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                          <span className="text-sm font-medium text-foreground">{councilConfig?.slot_1?.name || 'Llama 3'}</span>
                          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="h-4 w-px bg-border" />
                        <button
                          onClick={() => {
                            setSelectedSlotForSwap('slot_2');
                            setShowModelSwapModal(true);
                          }}
                          className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform"
                          title="Click to change model"
                        >
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: '0.3s' }} />
                          <span className="text-sm font-medium text-foreground">{councilConfig?.slot_2?.name || 'Claude 3.5'}</span>
                          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="h-4 w-px bg-border" />
                        <button
                          onClick={() => {
                            setSelectedSlotForSwap('slot_3');
                            setShowModelSwapModal(true);
                          }}
                          className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform"
                          title="Click to change model"
                        >
                          <div className="w-2 h-2 rounded-full bg-success animate-pulse" style={{ animationDelay: '0.6s' }} />
                          <span className="text-sm font-medium text-foreground">{councilConfig?.slot_3?.name || 'DeepSeek R1'}</span>
                          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
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
                    onDraftRating={handleDraftRating}
                    onRefineVerdict={handleRefineVerdict}
                    currentRating={message.humanRating}
                    draftARating={message.draftARating}
                    draftBRating={message.draftBRating}
                    onModelSwap={updateCouncilSlot}
                    currentModelAId={councilConfig?.slot_1?.id || councilConfig?.slot_1}
                    currentModelBId={councilConfig?.slot_2?.id || councilConfig?.slot_2}
                    computeStats={message.computeStats}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area with Cost Calculator */}
        <div className="space-y-2">
          <div className="flex justify-end px-4">
            <CostCalculator />
          </div>
          <ChatInput onSend={handleSendMessage} disabled={isProcessing} />
        </div>
      </div>

      {/* A/B Testing Notification Banner */}
      {showNotification && performanceData && (
        <ABTestingNotificationBanner
          performanceData={performanceData}
          onDismiss={dismissNotification}
        />
      )}

      {/* Modals */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
      
      <ModelRecommendationModal
        isOpen={showRecommendationModal}
        onClose={() => {
          setShowRecommendationModal(false);
          setPendingPrompt(null);
        }}
        onAccept={async () => {
          setShowRecommendationModal(false);
          if (pendingPrompt && recommendation) {
            // Build temporary council from recommendation
            const tempCouncil = {
              slot_1: { id: recommendation.recommendedDrafters[0], name: recommendation.recommendedDrafters[0] },
              slot_2: { id: recommendation.recommendedDrafters[1], name: recommendation.recommendedDrafters[1] },
              slot_3: { id: recommendation.recommendedDrafters[2], name: recommendation.recommendedDrafters[2] },
              slot_4: { id: recommendation.recommendedDrafters.length > 3 ? recommendation.recommendedDrafters[3] : null, name: recommendation.recommendedDrafters.length > 3 ? recommendation.recommendedDrafters[3] : null },
              slot_5: { id: recommendation.recommendedDrafters.length > 4 ? recommendation.recommendedDrafters[4] : null, name: recommendation.recommendedDrafters.length > 4 ? recommendation.recommendedDrafters[4] : null },
              auditor: { id: recommendation.recommendedAuditor, name: recommendation.recommendedAuditor }
            };
            await executeAudit(pendingPrompt.prompt, pendingPrompt.fileUrl, tempCouncil);
            setPendingPrompt(null);
          }
        }}
        onDecline={async () => {
          setShowRecommendationModal(false);
          if (pendingPrompt) {
            await executeAudit(pendingPrompt.prompt, pendingPrompt.fileUrl, null);
            setPendingPrompt(null);
          }
        }}
        recommendation={recommendation}
        isLoading={isLoadingRecommendation}
      />

      <ModelMarketModal
        open={showModelSwapModal}
        onOpenChange={setShowModelSwapModal}
        onModelSelect={handleModelSwapFromPill}
        currentModel={selectedSlotForSwap ? (councilConfig?.[selectedSlotForSwap]?.id || councilConfig?.[selectedSlotForSwap]) : undefined}
      />
    </div>
  );
};

export default Index;
