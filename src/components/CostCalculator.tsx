import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, DollarSign, Sparkles } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ModelPrice {
  id: string;
  name: string;
  input_price: number;
  output_price: number;
}

interface CouncilConfig {
  [key: string]: {
    id: string;
    name: string;
    role: string;
  };
}

export default function CostCalculator() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [councilConfig, setCouncilConfig] = useState<CouncilConfig | null>(null);
  const [modelPrices, setModelPrices] = useState<Map<string, ModelPrice>>(new Map());
  const [loading, setLoading] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Array<{ model: string; role: string; cost: number }>>([]);

  useEffect(() => {
    if (open) {
      fetchCouncilAndPricing();
    }
  }, [open]);

  const fetchCouncilAndPricing = async () => {
    setLoading(true);
    
    // Fetch user's council config
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('council_config')
      .eq('id', user.id)
      .single();

    if (profile?.council_config) {
      setCouncilConfig(profile.council_config as CouncilConfig);
    }

    // Fetch all model prices
    const { data: prices } = await supabase
      .from('ai_models')
      .select('*');

    if (prices) {
      const priceMap = new Map<string, ModelPrice>();
      prices.forEach(price => {
        priceMap.set(price.id, price);
      });
      setModelPrices(priceMap);
    }

    setLoading(false);
  };

  const estimateTokens = (text: string): { input: number; output: number } => {
    // Rough estimate: 1 token ≈ 4 characters for English text
    const baseInputTokens = Math.ceil(text.length / 4);
    
    // Add overhead for system prompts and context (estimated 500 tokens)
    const inputTokens = baseInputTokens + 500;
    
    // Estimate output tokens based on prompt complexity
    // Short prompts: ~500 tokens, Medium: ~1000, Long: ~2000
    let outputTokens = 500;
    if (baseInputTokens > 200) outputTokens = 1000;
    if (baseInputTokens > 500) outputTokens = 2000;
    
    return { input: inputTokens, output: outputTokens };
  };

  const calculateCost = () => {
    if (!prompt.trim() || !councilConfig) return;

    const { input: inputTokens, output: outputTokens } = estimateTokens(prompt);
    const councilBreakdown: Array<{ model: string; role: string; cost: number }> = [];
    let totalCost = 0;

    // Calculate cost for each model in the council
    Object.values(councilConfig).forEach((slot) => {
      const modelPrice = modelPrices.get(slot.id);
      if (!modelPrice) return;

      // Cost = (input_tokens / 1M * input_price) + (output_tokens / 1M * output_price)
      const cost = (inputTokens / 1_000_000) * modelPrice.input_price + 
                   (outputTokens / 1_000_000) * modelPrice.output_price;
      
      councilBreakdown.push({
        model: slot.name,
        role: slot.role,
        cost: cost
      });
      
      totalCost += cost;
    });

    setBreakdown(councilBreakdown);
    setEstimatedCost(totalCost);
  };

  useEffect(() => {
    if (prompt && councilConfig && modelPrices.size > 0) {
      calculateCost();
    }
  }, [prompt, councilConfig, modelPrices]);

  const getComplexityLevel = (cost: number): { label: string; color: string } => {
    if (cost < 0.01) return { label: 'Low Cost', color: 'text-green-600' };
    if (cost < 0.05) return { label: 'Moderate Cost', color: 'text-yellow-600' };
    return { label: 'High Cost', color: 'text-red-600' };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Calculator className="h-4 w-4" />
          Cost Calculator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Audit Cost Calculator
          </DialogTitle>
          <DialogDescription>
            Estimate the cost of your audit before running it based on your council configuration and prompt complexity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Enter Your Prompt
            </label>
            <Textarea
              placeholder="Type your audit prompt here to estimate costs..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-gray-500">
              {prompt.length > 0 ? `${prompt.length} characters • ~${Math.ceil(prompt.length / 4)} tokens` : 'Start typing to see token estimate'}
            </p>
          </div>

          {/* Cost Estimate */}
          {loading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ) : estimatedCost !== null ? (
            <>
              {/* Total Cost */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Estimated Total Cost</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900">
                          ${estimatedCost.toFixed(4)}
                        </span>
                        <span className={`text-sm font-medium ${getComplexityLevel(estimatedCost).color}`}>
                          {getComplexityLevel(estimatedCost).label}
                        </span>
                      </div>
                    </div>
                    <DollarSign className="h-12 w-12 text-blue-600 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown by Model */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Cost Breakdown by Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {breakdown.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{item.model}</p>
                          <p className="text-xs text-gray-500">{item.role}</p>
                        </div>
                        <span className="text-lg font-semibold text-gray-700">
                          ${item.cost.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>Note:</strong> This is an estimate based on typical token usage patterns. 
                    Actual costs may vary depending on the complexity of the analysis, context length, 
                    and final response length. Costs are deducted from your credit balance after the audit completes.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center text-gray-500 py-8">
                  <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Enter a prompt above to see cost estimate</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {estimatedCost !== null && (
            <Button onClick={() => setOpen(false)}>
              Proceed with Audit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}