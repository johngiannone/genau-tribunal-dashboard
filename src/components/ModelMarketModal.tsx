import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Check, Search } from "lucide-react";

interface ModelMarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModelSelect: (modelId: string) => void;
  currentModel?: string;
}

interface Model {
  id: string;
  name: string;
  provider: string;
  character: string;
  role: string;
  strengths: string;
  badge?: string;
}

const AVAILABLE_MODELS: Model[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    character: "The Chairman",
    role: "All-Purpose Leadership",
    strengths: "Vision, reasoning, long context",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    character: "The Critic",
    role: "Deep Analysis Expert",
    strengths: "Code understanding, nuanced critique",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    character: "The Auditor",
    role: "Reasoning Engine",
    strengths: "Chain-of-thought, technical auditing",
  },
  {
    id: "meta-llama/llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    character: "The Speedster",
    role: "Fast Execution",
    strengths: "Rapid inference, cost-effective",
  },
  {
    id: "qwen/qwen-2.5-coder-32b",
    name: "Qwen 2.5 Coder",
    provider: "Alibaba",
    character: "The Architect",
    role: "Code Specialist",
    strengths: "Programming, system design",
  },
  {
    id: "xai/grok-beta",
    name: "Grok Beta",
    provider: "xAI",
    character: "The Reporter",
    role: "Real-Time Intelligence",
    strengths: "Current events, conversational wit",
  },
  {
    id: "mistralai/mistral-large-2",
    name: "Mistral Large 2",
    provider: "Mistral AI",
    character: "The Philosopher",
    role: "Deep Thinking",
    strengths: "Multilingual, philosophical reasoning",
    badge: "PRO",
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    character: "The Librarian",
    role: "Multimodal Specialist",
    strengths: "Vision, 2M context, document analysis",
  },
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    character: "The Researcher",
    role: "Enterprise RAG",
    strengths: "Retrieval, citations, grounded research",
  },
  {
    id: "liquid/lfm-40b",
    name: "Liquid LFM 40B",
    provider: "Liquid AI",
    character: "The Fluid Thinker",
    role: "Adaptive Reasoning",
    strengths: "Dynamic context, efficient inference",
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    character: "The Professor",
    role: "Maximum Intelligence",
    strengths: "Complex reasoning, academic depth",
    badge: "PRO",
  },
  // Additional high-quality models
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    provider: "Google",
    character: "The Scout",
    role: "Speed Demon",
    strengths: "Ultra-fast responses, multimodal",
  },
  {
    id: "deepseek/deepseek-v2",
    name: "DeepSeek V2",
    provider: "DeepSeek",
    character: "The Analyst",
    role: "Efficient Reasoning",
    strengths: "Cost-effective, fast inference",
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    character: "The Optimizer",
    role: "Fast GPT-4",
    strengths: "Speed, reliability, balanced performance",
  },
  {
    id: "perplexity/llama-3-sonar-large",
    name: "Sonar Large",
    provider: "Perplexity",
    character: "The Detective",
    role: "Search-Augmented",
    strengths: "Web-grounded, real-time citations",
  },
];

export const ModelMarketModal = ({
  open,
  onOpenChange,
  onModelSelect,
  currentModel,
}: ModelMarketModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredModels = AVAILABLE_MODELS.filter((model) => {
    const search = searchTerm.toLowerCase();
    return (
      model.name.toLowerCase().includes(search) ||
      model.provider.toLowerCase().includes(search) ||
      model.character.toLowerCase().includes(search) ||
      model.role.toLowerCase().includes(search)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-card/95 backdrop-blur-xl border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono font-bold gradient-text">
            Model Market
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose an AI model for this council slot. Each model brings unique strengths to the analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models by name, provider, or character..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <p className="text-muted-foreground font-mono">No models found matching "{searchTerm}"</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="mt-4"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModels.map((model) => {
              const isSelected = currentModel === model.id;

              return (
                <div
                  key={model.id}
                  className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/50 bg-card/50"
                  }`}
                  onClick={() => onModelSelect(model.id)}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  {model.badge && !isSelected && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {model.badge}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-foreground">{model.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {model.provider}
                      </p>
                      <p className="text-xs text-primary/80 font-medium mt-1">
                        {model.character}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground/90">{model.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">{model.strengths}</p>
                    </div>

                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onModelSelect(model.id);
                      }}
                    >
                      {isSelected ? "Selected" : "Select Model"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
