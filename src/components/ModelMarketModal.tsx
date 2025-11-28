import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Check, Search, Loader2, AlertTriangle, Star } from "lucide-react";
import { fetchOpenRouterModels, filterModelsByCategory, sortModels, Model } from "@/lib/openrouter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [sortBy, setSortBy] = useState("popular");
  const [pendingModel, setPendingModel] = useState<Model | null>(null);
  const [showExpensiveWarning, setShowExpensiveWarning] = useState(false);
  const [favoriteModels, setFavoriteModels] = useState<string[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch models using TanStack Query
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['openrouter-models'],
    queryFn: fetchOpenRouterModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: open, // Only fetch when modal is open
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
    ? models.filter(m => favoriteModels.includes(m.id))
    : filterModelsByCategory(models, activeCategory);
  
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

  // Group models into rows (2 per row)
  const rows = [];
  for (let i = 0; i < filteredModels.length; i += 2) {
    rows.push(filteredModels.slice(i, i + 2));
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
      onModelSelect(model.id);
    }
  };

  const confirmExpensiveModel = () => {
    if (pendingModel) {
      onModelSelect(pendingModel.id);
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
        description: `${models.find(m => m.id === modelId)?.name || "Model"} ${isFavorite ? "removed from" : "added to"} your favorites.`,
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
            Choose from {models.length}+ AI models. Each model brings unique strengths to the analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-card/50">
            <TabsTrigger value="favorites" className="text-xs">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="free" className="text-xs">Free</TabsTrigger>
            <TabsTrigger value="top-tier" className="text-xs">Top Tier</TabsTrigger>
            <TabsTrigger value="coding" className="text-xs">Coding</TabsTrigger>
            <TabsTrigger value="roleplay" className="text-xs">Roleplay</TabsTrigger>
          </TabsList>
        </Tabs>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
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

  return (
    <div
      className={`relative p-4 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-primary/50 bg-card/50"
      }`}
      onClick={onClick}
    >
      {/* Favorite Star Button */}
      <button
        onClick={onToggleFavorite}
        className="absolute top-3 left-3 z-10 p-1 rounded-full hover:bg-primary/10 transition-colors"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={`w-5 h-5 transition-all ${
            isFavorite
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground hover:text-yellow-400"
          }`}
        />
      </button>

      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      )}

      {model.isFree && !isSelected && (
        <div className="absolute top-3 right-3">
          <Badge className="text-xs font-mono bg-green-500/20 text-green-400 border-green-500/30">
            FREE
          </Badge>
        </div>
      )}

      {!model.isFree && !isSelected && (
        <div className="absolute top-3 right-3">
          <Badge className="text-xs font-mono bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            {priceDisplay}
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

        <div className="pt-2 border-t border-border/30">
          <p className="text-xs font-mono">
            {model.isFree ? (
              <span className="text-green-400 font-bold">FREE</span>
            ) : (
              <>
                <span className="text-muted-foreground">Price: </span>
                <span className="text-primary font-semibold">{priceDisplay}</span>
              </>
            )}
          </p>
        </div>

        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {isSelected ? "Selected" : "Select Model"}
        </Button>
      </div>
    </div>
  );
};
