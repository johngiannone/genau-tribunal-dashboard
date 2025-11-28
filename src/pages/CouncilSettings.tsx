import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Settings2, Sparkles } from "lucide-react";
import { ModelMarketModal } from "@/components/ModelMarketModal";
import { Session } from "@supabase/supabase-js";

interface CouncilConfig {
  slot_1: string;
  slot_2: string;
  slot_3: string;
  slot_4: string;
  slot_5: string;
}

const DEFAULT_COUNCIL_CONFIG: CouncilConfig = {
  slot_1: "openai/gpt-4o",
  slot_2: "anthropic/claude-3.5-sonnet",
  slot_3: "qwen/qwen-2.5-coder-32b",
  slot_4: "xai/grok-beta",
  slot_5: "meta-llama/llama-3.3-70b",
};

const SLOT_NAMES = {
  slot_1: "The Chairman",
  slot_2: "The Critic",
  slot_3: "The Architect",
  slot_4: "The Reporter",
  slot_5: "The Speedster",
};

const CouncilSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [councilConfig, setCouncilConfig] = useState<CouncilConfig>(DEFAULT_COUNCIL_CONFIG);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (session?.user) {
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

    if (error) {
      console.error("Error fetching council config:", error);
      toast({
        title: "Error",
        description: "Failed to load council configuration",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data?.council_config) {
      setCouncilConfig(data.council_config as unknown as CouncilConfig);
    } else {
      // Keep default config if no saved config exists
      setCouncilConfig(DEFAULT_COUNCIL_CONFIG);
    }
    setLoading(false);
  };

  const handleSlotClick = (slot: string) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleModelSelect = async (modelId: string) => {
    if (!session?.user || !selectedSlot) return;

    const updatedConfig = {
      ...councilConfig,
      [selectedSlot]: modelId,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ council_config: updatedConfig as any })
      .eq('id', session.user.id);

    if (error) {
      console.error("Error updating council config:", error);
      toast({
        title: "Error",
        description: "Failed to update model selection",
        variant: "destructive",
      });
      return;
    }

    setCouncilConfig(updatedConfig);
    setIsModalOpen(false);
    toast({
      title: "Council Updated",
      description: "Your AI Council has been reconfigured",
    });
  };

  const getModelDisplayName = (modelId: string) => {
    return modelId.split('/')[1]?.replace(/-/g, ' ').toUpperCase() || modelId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background patterns */}
      <div className="geometric-grid" />
      <div className="geometric-mesh" />

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/settings")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Button>

            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-mono font-bold text-foreground">
                Council Chamber
              </h1>
            </div>

            <div className="w-[120px]" /> {/* Spacer */}
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-mono font-bold gradient-text mb-4">
              Configure Your AI Council
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Select the AI models that will analyze your queries. Each slot represents
              a different perspective in the consensus engine.
            </p>
          </div>

          {/* Council Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {Object.entries(councilConfig).map(([slot, modelId]) => (
              <Card
                key={slot}
                className="group relative p-6 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                onClick={() => handleSlotClick(slot)}
              >
                <div className="absolute top-3 right-3">
                  <Sparkles className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-mono text-primary mb-2">
                      {SLOT_NAMES[slot as keyof typeof SLOT_NAMES]}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">
                      {getModelDisplayName(modelId)}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-border/30">
                    <p className="text-xs text-muted-foreground font-mono">
                      {modelId}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSlotClick(slot);
                    }}
                  >
                    Change Model
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <ModelMarketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onModelSelect={handleModelSelect}
        currentModel={selectedSlot ? councilConfig[selectedSlot as keyof CouncilConfig] : undefined}
      />
    </div>
  );
};

export default CouncilSettings;
