import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Check, Search, Loader2, AlertTriangle, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { fetchOpenRouterModels, filterModelsByCategory, sortModels, Model } from "@/lib/openrouter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ModelMarketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModelSelect: (modelId: string, modelName?: string) => void | Promise<void>;
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
  const [sortBy, setSortBy] = useState("popular");
  const [pendingModel, setPendingModel] = useState<Model | null>(null);
  const [showExpensiveWarning, setShowExpensiveWarning] = useState(false);
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch models using TanStack Query
  const { data: models = [], isLoading, error, refetch } = useQuery({
    queryKey: ['openrouter-models'],
    queryFn: fetchOpenRouterModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: open, // Only fetch when modal is open
    retry: 2, // Retry failed requests twice
  });

  // Fetch live prices from database
  const { data: dbPrices } = useQuery({
    queryKey: ['ai-model-prices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*');
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: open,
    retry: 1,
  });

  // Merge live prices with model data
  const modelsWithLivePrices = models.map(model => {
    const dbPrice = dbPrices?.find(p => p.id === model.id);
    if (dbPrice) {
      // Update with live pricing from database
      const avgCost = (parseFloat(String(dbPrice.input_price)) + parseFloat(String(dbPrice.output_price))) / 2 * 1000000;
      return {
        ...model,
        pricing: {
          prompt: String(dbPrice.input_price),
          completion: String(dbPrice.output_price),
        },
        avgCostPer1M: avgCost,
        isFree: avgCost === 0,
        priceTier: avgCost === 0 ? 0 : avgCost < 1 ? 1 : avgCost < 5 ? 2 : avgCost < 10 ? 3 : 4,
      };
    }
    return model;
  });

  // Fetch user's favorite models from Supabase
  useEffect(() => {
    if (!open) return;
    
    const fetchFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('favorite_models')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        const favorites = data.favorite_models;
        if (Array.isArray(favorites)) {
          setFavoriteModels(favorites as string[]);
        }
      }
    };

    fetchFavorites();
  }, [open]);

  const filteredByCategory = activeCategory === "favorites" 
    ? modelsWithLivePrices.filter(m => favoriteModels.includes(m.id))
    : filterModelsByCategory(modelsWithLivePrices, activeCategory);
  
  const filteredAndSearched = filteredByCategory.filter((model) => {
    const search = searchTerm.toLowerCase();
    return (
      model.name.toLowerCase().includes(search) ||
      model.provider.toLowerCase().includes(search) ||
      model.id.toLowerCase().includes(search) ||
      model.description.toLowerCase().includes(search)
    );
  });

  const filteredModels = sortModels(filteredAndSearched, sortBy, favoriteModels);

  // Group models into rows (3 per row for desktop)
  const rows = [];
  for (let i = 0; i < filteredModels.length; i += 3) {
    rows.push(filteredModels.slice(i, i + 3));
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 240,
    overscan: 5,
  });

  const handleModelClick = (model: Model) => {
    if (model.avgCostPer1M > 10) {
      setPendingModel(model);
      setShowExpensiveWarning(true);
    } else {
      onModelSelect(model.id, model.name);
    }
  };

  const confirmExpensiveModel = () => {
    if (pendingModel) {
      onModelSelect(pendingModel.id, pendingModel.name);
    }
    setShowExpensiveWarning(false);
    setPendingModel(null);
  };

  const toggleFavorite = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to favorite models.",
        variant: "destructive",
      });
      return;
    }

    const isFavorite = favoriteModels.includes(modelId);
    const updatedFavorites = isFavorite
      ? favoriteModels.filter(id => id !== modelId)
      : [...favoriteModels, modelId];

    // Optimistically update UI
    setFavoriteModels(updatedFavorites);

    // Save to database
    const { error } = await supabase
      .from('profiles')
      .update({ favorite_models: updatedFavorites })
      .eq('id', user.id);

    if (error) {
      // Revert on error
      setFavoriteModels(favoriteModels);
            toast({
        title: "Failed to update favorites",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: `${modelsWithLivePrices.find(m => m.id === modelId)?.name || "Model"} ${isFavorite ? "removed from" : "added to"} your favorites.`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-card/95 backdrop-blur-xl border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono font-bold gradient-text">
            Model Market
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isLoading ? (
              "Loading available models..."
            ) : error ? (
              "Failed to load models from OpenRouter"
            ) : (
              `Choose from ${modelsWithLivePrices.length} AI models. Each model brings unique strengths to the analysis.`
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("all")}
            className="rounded-full"
          >
            All
          </Button>
          <Button
            variant={activeCategory === "free" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("free")}
            className="rounded-full"
          >
            Free
          </Button>
          <Button
            variant={activeCategory === "coding" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("coding")}
            className="rounded-full"
          >
            Coding
          </Button>
          <Button
            variant={activeCategory === "chat" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("chat")}
            className="rounded-full"
          >
            Chat
          </Button>
        </div>

        {/* Search Bar and Sort */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search models by name, provider, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card/50 border-border/50"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-card/50 border-border/50">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="cheapest">Cheapest First</SelectItem>
              <SelectItem value="smartest">Smartest First</SelectItem>
              <SelectItem value="context">Context Window</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-mono text-sm">Loading models from OpenRouter...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
            <p className="text-foreground font-semibold mb-2">Failed to load models</p>
            <p className="text-muted-foreground text-sm mb-4">
              {error instanceof Error ? error.message : 'Unable to connect to OpenRouter'}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Retry
            </Button>
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-center">
            <p className="text-muted-foreground font-mono mb-2">No models available</p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
              Refresh
            </Button>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-center">
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
          <>
            {dbPrices && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <Check className="w-4 h-4" />
                <span className="font-mono">Live pricing synced from database</span>
              </div>
            )}
            <div
            ref={parentRef}
            className="h-[500px] overflow-auto pr-4"
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const rowModels = rows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                      {rowModels.map((model) => (
                        <ModelCard
                          key={model.id}
                          model={model}
                          isSelected={currentModel === model.id}
                          isFavorite={favoriteModels.includes(model.id)}
                          onClick={() => handleModelClick(model)}
                          onToggleFavorite={(e) => toggleFavorite(model.id, e)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}

        <AlertDialog open={showExpensiveWarning} onOpenChange={setShowExpensiveWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Premium Model Warning
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-semibold">{pendingModel?.name}</span> is a premium model that costs{" "}
                <span className="text-yellow-500 font-bold">
                  ${pendingModel?.avgCostPer1M.toFixed(2)} per 1M tokens
                </span>
                . This may drain your credits faster than standard models.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingModel(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmExpensiveModel}>Continue Anyway</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

interface ModelCardProps {
  model: Model;
  isSelected: boolean;
  isFavorite: boolean;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

const ModelCard = ({ model, isSelected, isFavorite, onClick, onToggleFavorite }: ModelCardProps) => {
  const priceDisplay = model.isFree
    ? "FREE"
    : `$${model.avgCostPer1M < 1 ? model.avgCostPer1M.toFixed(3) : model.avgCostPer1M.toFixed(2)} / 1M`;

  // Cost tier logic
  const getCostTierBadge = () => {
    if (model.isFree) {
      return { label: "Free", className: "bg-green-100 text-green-700 border-green-300" };
    } else if (model.avgCostPer1M < 1) {
      return { label: "$", className: "bg-green-100 text-green-700 border-green-300" };
    } else if (model.avgCostPer1M < 10) {
      return { label: "$$", className: "bg-yellow-100 text-yellow-700 border-yellow-300" };
    } else {
      return { label: "$$$", className: "bg-red-100 text-red-700 border-red-300" };
    }
  };

  const costTier = getCostTierBadge();

  // Provider icon mapping
  const getProviderIcon = (provider: string) => {
    const providerLower = provider.toLowerCase();
    if (providerLower.includes("openai")) return "🤖";
    if (providerLower.includes("anthropic")) return "🧠";
    if (providerLower.includes("google")) return "🔍";
    if (providerLower.includes("meta")) return "📘";
    if (providerLower.includes("mistral")) return "🌪️";
    if (providerLower.includes("cohere")) return "💬";
    return "⚡";
  };

  return (
    <TooltipProvider>
      <div
        className={`group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer bg-white ${
          isSelected
            ? "border-teal-500 shadow-md ring-2 ring-teal-500/20"
            : "border-gray-200 hover:border-teal-400 hover:shadow-md"
        }`}
        onClick={onClick}
      >
        {/* Provider Icon - Top Left */}
        <div className="absolute top-3 left-3 text-xl">
          {getProviderIcon(model.provider)}
        </div>

        {/* Favorite Star Button - Top Right */}
        <button
          onClick={onToggleFavorite}
          className="absolute top-3 right-3 z-10 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className={`w-5 h-5 transition-all ${
              isFavorite
                ? "fill-[#FFD700] text-[#FFD700]"
                : "text-gray-400 hover:text-[#FFD700]"
            }`}
          />
        </button>

        {/* Selected Check Badge - Top Right */}
        {isSelected && (
          <div className="absolute top-3 right-10">
            <Badge className="text-xs font-medium bg-teal-500 text-white border-teal-600">
              <Check className="w-3 h-3 mr-1" />
              Selected
            </Badge>
          </div>
        )}

        <div className="space-y-2.5 pt-8">
          {/* Provider & Cost Tier Row */}
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs font-normal text-gray-600 border-gray-300">
              {model.provider}
            </Badge>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={`text-xs font-bold cursor-help ${costTier.className}`}>
                  {costTier.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{priceDisplay}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Model Name - Bold and Primary */}
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">{model.name}</h3>
            {(model.isPopular || model.isNew) && (
              <div className="flex gap-1 mt-1">
                {model.isPopular && (
                  <Badge className="text-xs font-medium bg-orange-100 text-orange-700 border-orange-300">
                    🔥 Popular
                  </Badge>
                )}
                {model.isNew && (
                  <Badge className="text-xs font-medium bg-green-100 text-green-700 border-green-300">
                    ✨ New
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Context Window */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
              {(model.contextLength / 1000).toFixed(0)}k
            </Badge>
            {model.contextLength >= 100000 && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                Long Context
              </Badge>
            )}
          </div>

          {/* Description - Truncated to 2 Lines */}
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
            {model.description}
          </p>

          {/* Select Button */}
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className={`w-full mt-2 ${isSelected ? "bg-teal-500 hover:bg-teal-600" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {isSelected ? "Selected" : "Select Model"}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};
