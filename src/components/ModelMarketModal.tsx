import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Check } from "lucide-react";

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
  role: string;
  strengths: string;
  badge?: string;
}

const AVAILABLE_MODELS: Model[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    role: "All-Purpose Generalist",
    strengths: "Vision, reasoning, long context",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    role: "Deep Analysis Expert",
    strengths: "Code understanding, nuanced writing",
    badge: "PRO",
  },
  {
    id: "anthropic/claude-opus",
    name: "Claude Opus",
    provider: "Anthropic",
    role: "Maximum Intelligence",
    strengths: "Complex reasoning, research",
    badge: "PRO",
  },
  {
    id: "meta-llama/llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    role: "Open-Source Powerhouse",
    strengths: "Fast inference, cost-effective",
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    role: "Multimodal Specialist",
    strengths: "Vision, 2M context window",
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    provider: "Google",
    role: "Speed Demon",
    strengths: "Ultra-fast responses, multimodal",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    role: "Reasoning Engine",
    strengths: "Chain-of-thought, technical tasks",
  },
  {
    id: "deepseek/deepseek-v2",
    name: "DeepSeek V2",
    provider: "DeepSeek",
    role: "Efficient Reasoning",
    strengths: "Cost-effective, fast inference",
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    role: "European Flagship",
    strengths: "Multilingual, instruction-following",
    badge: "PRO",
  },
  {
    id: "qwen/qwen-2.5-coder-32b",
    name: "Qwen 2.5 Coder",
    provider: "Alibaba",
    role: "Code Specialist",
    strengths: "Programming, debugging",
  },
  {
    id: "xai/grok-beta",
    name: "Grok Beta",
    provider: "xAI",
    role: "Conversational AI",
    strengths: "Real-time data, humor",
  },
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    role: "Enterprise RAG",
    strengths: "Retrieval, citations",
  },
  {
    id: "databricks/dbrx-instruct",
    name: "DBRX Instruct",
    provider: "Databricks",
    role: "Enterprise Workhorse",
    strengths: "SQL, data analysis",
  },
  {
    id: "perplexity/llama-3-sonar-large",
    name: "Sonar Large",
    provider: "Perplexity",
    role: "Search-Augmented",
    strengths: "Web-grounded responses",
  },
];

export const ModelMarketModal = ({
  open,
  onOpenChange,
  onModelSelect,
  currentModel,
}: ModelMarketModalProps) => {
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

        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_MODELS.map((model) => {
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
                    </div>

                    <div>
                      <p className="text-sm text-primary font-medium">{model.role}</p>
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
