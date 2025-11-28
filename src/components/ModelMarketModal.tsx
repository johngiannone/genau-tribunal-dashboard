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
  strengths: string[];
  badge?: string;
}

const AVAILABLE_MODELS: Model[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    role: "All-Purpose Powerhouse",
    strengths: ["Reasoning", "Analysis", "General Knowledge"],
    badge: "Recommended",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    role: "Detailed Analysis",
    strengths: ["Long Context", "Thoughtful", "Precise"],
    badge: "Popular",
  },
  {
    id: "meta-llama/llama-3-70b-instruct",
    name: "Llama 3 70B",
    provider: "Meta",
    role: "Fast & Efficient",
    strengths: ["Speed", "Cost-Effective", "Open Source"],
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    role: "Multimodal Expert",
    strengths: ["Image Analysis", "Long Context", "Fast"],
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    role: "Synthesis Specialist",
    strengths: ["Reasoning", "Analysis", "Synthesis"],
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "Mistral AI",
    role: "Creative Writing",
    strengths: ["Creativity", "Nuance", "Multilingual"],
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    role: "Premium Analysis",
    strengths: ["Deep Thinking", "Complex Tasks", "Accuracy"],
    badge: "Premium",
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    role: "Fast GPT-4",
    strengths: ["Speed", "Cost-Effective", "Reliable"],
  },
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    role: "RAG Optimized",
    strengths: ["Retrieval", "Citations", "Grounded"],
  },
  {
    id: "perplexity/llama-3-sonar-large",
    name: "Sonar Large",
    provider: "Perplexity",
    role: "Research Focused",
    strengths: ["Web Search", "Citations", "Up-to-date"],
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
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {model.strengths.map((strength) => (
                        <Badge key={strength} variant="outline" className="text-xs">
                          {strength}
                        </Badge>
                      ))}
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
