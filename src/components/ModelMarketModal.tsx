import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Check, Search, Loader2 } from "lucide-react";
import { fetchOpenRouterModels, filterModelsByCategory, Model } from "@/lib/openrouter";

interface ModelMarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModelSelect: (modelId: string) => void;
  currentModel?: string;
}

export const ModelMarketModal = ({
  open,
  onOpenChange,
  onModelSelect,
  currentModel,
}: ModelMarketModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Fetch models using TanStack Query
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['openrouter-models'],
    queryFn: fetchOpenRouterModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: open, // Only fetch when modal is open
  });

  const filteredByCategory = filterModelsByCategory(models, activeCategory);
  
  const filteredModels = filteredByCategory.filter((model) => {
    const search = searchTerm.toLowerCase();
    return (
      model.name.toLowerCase().includes(search) ||
      model.provider.toLowerCase().includes(search) ||
      model.id.toLowerCase().includes(search) ||
      model.description.toLowerCase().includes(search)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-card/95 backdrop-blur-xl border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono font-bold gradient-text">
            Model Market
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose from {models.length}+ AI models. Each model brings unique strengths to the analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-card/50">
            <TabsTrigger value="all" className="text-xs">All Models</TabsTrigger>
            <TabsTrigger value="free" className="text-xs">Free</TabsTrigger>
            <TabsTrigger value="top-tier" className="text-xs">Top Tier</TabsTrigger>
            <TabsTrigger value="coding" className="text-xs">Coding</TabsTrigger>
            <TabsTrigger value="roleplay" className="text-xs">Roleplay</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models by name, provider, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground font-mono text-sm">Loading models from OpenRouter...</p>
            </div>
          ) : filteredModels.length === 0 ? (
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

                  {model.isFree && (
                    <div className="absolute top-3 right-3">
                      <Badge className="text-xs font-mono bg-green-500/20 text-green-400 border-green-500/30">
                        FREE
                      </Badge>
                    </div>
                  )}

                  {!model.isFree && !isSelected && (
                    <div className="absolute top-3 right-3">
                      <Badge className="text-xs font-mono bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        {'$'.repeat(model.priceTier)}
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

                    <div className="flex items-center gap-2 text-xs font-mono text-primary/80">
                      <span>{(model.contextLength / 1000).toFixed(0)}k context</span>
                      {model.contextLength >= 100000 && (
                        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
                          Long Context
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {model.description}
                      </p>
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
