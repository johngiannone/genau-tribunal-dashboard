import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Settings2, Sparkles } from "lucide-react";
import { ModelMarketModal } from "@/components/ModelMarketModal";
import { Session } from "@supabase/supabase-js";

interface SlotConfig {
  id: string;
  name: string;
  role: string;
}

interface CouncilConfig {
  slot_1: SlotConfig;
  slot_2: SlotConfig;
  slot_3: SlotConfig;
  slot_4: SlotConfig;
  slot_5: SlotConfig;
}

const DEFAULT_COUNCIL: CouncilConfig = {
  slot_1: { id: "openai/gpt-4o", name: "GPT-4o", role: "The Chairman" },
  slot_2: { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", role: "The Critic" },
  slot_3: { id: "qwen/qwen-2.5-coder-32b", name: "Qwen 2.5 Coder", role: "The Architect" },
  slot_4: { id: "xai/grok-beta", name: "Grok Beta", role: "The Reporter" },
  slot_5: { id: "meta-llama/llama-3.3-70b", name: "Llama 3.3 70B", role: "The Speedster" }
};

const CouncilSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [councilConfig, setCouncilConfig] = useState<CouncilConfig>(DEFAULT_COUNCIL);
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

    // If council_config is null or empty, save the default and use it
    if (!data?.council_config || Object.keys(data.council_config).length === 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ council_config: DEFAULT_COUNCIL as any })
        .eq('id', session.user.id);

      if (updateError) {
        console.error("Error saving default council config:", updateError);
      }

      setCouncilConfig(DEFAULT_COUNCIL);
      setLoading(false);
      return;
    }

    // Merge with defaults to ensure no slots are missing
    const loadedConfig = data.council_config as any;
    const mergedConfig: CouncilConfig = { ...DEFAULT_COUNCIL };
    
    for (const slot of Object.keys(DEFAULT_COUNCIL) as Array<keyof CouncilConfig>) {
      if (loadedConfig[slot]) {
        mergedConfig[slot] = loadedConfig[slot];
      }
    }

    setCouncilConfig(mergedConfig);
    setLoading(false);
  };

  const handleSlotClick = (slot: string) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handleModelSelect = async (modelId: string, modelName: string) => {
    if (!session?.user || !selectedSlot) return;

    const slotRole = DEFAULT_COUNCIL[selectedSlot as keyof CouncilConfig].role;

    const updatedConfig = {
      ...councilConfig,
      [selectedSlot]: {
        id: modelId,
        name: modelName,
        role: slotRole,
      },
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
      description: `${modelName} is now ${slotRole}`,
    });
  };


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
            {loading ? (
              // Skeleton loading state for 5 slots
              Array.from({ length: 5 }).map((_, index) => (
                <Card key={index} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                    <div className="pt-4 border-t border-border/30">
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                  </div>
                </Card>
              ))
            ) : (
              Object.entries(councilConfig).map(([slot, slotConfig]) => (
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
                        {slotConfig.role}
                      </div>
                      <h3 className="text-lg font-bold text-foreground">
                        {slotConfig.name}
                      </h3>
                    </div>

                    <div className="pt-4 border-t border-border/30">
                      <p className="text-xs text-muted-foreground font-mono">
                        {slotConfig.id}
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
              ))
            )}
          </div>
        </div>
      </div>

      <ModelMarketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onModelSelect={(modelId, modelName) => handleModelSelect(modelId, modelName || modelId)}
        currentModel={selectedSlot ? councilConfig[selectedSlot as keyof CouncilConfig].id : undefined}
      />
    </div>
  );
};

export default CouncilSettings;
