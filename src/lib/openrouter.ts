export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality?: string;
  };
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  contextLength: number;
  isFree: boolean;
  priceTier: number; // 1-4 for $, $$, $$$, $$$$
  avgCostPer1M: number; // Average cost per 1M tokens
}

export async function fetchOpenRouterModels(): Promise<Model[]> {
  try {
    console.log('Fetching models from OpenRouter API...');
    const response = await fetch('https://openrouter.ai/api/v1/models');
    
    if (!response.ok) {
      console.error('OpenRouter API returned error:', response.status, response.statusText);
      throw new Error(`Failed to fetch models from OpenRouter: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully fetched models from OpenRouter:', data.data?.length || 0, 'models');
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid response format from OpenRouter:', data);
      throw new Error('Invalid response format from OpenRouter');
    }
    
    // Map the OpenRouter response to our Model format
    const models: Model[] = data.data.map((model: OpenRouterModel) => {
      const provider = model.id.split('/')[0];
      const isFree = model.pricing.prompt === "0" || model.pricing.prompt === "0.0";
      
      // Calculate price tier based on average cost per 1M tokens
      const promptCost = parseFloat(model.pricing.prompt);
      const completionCost = parseFloat(model.pricing.completion);
      const avgCost = (promptCost + completionCost) / 2;
      
      let priceTier = 1;
      if (avgCost === 0) priceTier = 0; // Free
      else if (avgCost < 1) priceTier = 1; // $
      else if (avgCost < 5) priceTier = 2; // $$
      else if (avgCost < 15) priceTier = 3; // $$$
      else priceTier = 4; // $$$$
      
      return {
        id: model.id,
        name: model.name,
        provider: provider.charAt(0).toUpperCase() + provider.slice(1),
        description: model.description || 'No description available',
        pricing: model.pricing,
        contextLength: model.context_length || 0,
        isFree,
        priceTier,
        avgCostPer1M: avgCost,
      };
    });

    console.log('Processed models:', models.length);
    return models;
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    console.log('Using fallback models instead');
    // Return fallback models if API fails
    return getFallbackModels();
  }
}

function getFallbackModels(): Model[] {
  return [
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      provider: "OpenAI",
      description: "All-Purpose Leadership - Vision, reasoning, long context",
      pricing: { prompt: "5", completion: "15" },
      contextLength: 128000,
      isFree: false,
      priceTier: 3,
      avgCostPer1M: 10,
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      description: "Deep Analysis Expert - Code understanding, nuanced critique",
      pricing: { prompt: "3", completion: "15" },
      contextLength: 200000,
      isFree: false,
      priceTier: 3,
      avgCostPer1M: 9,
    },
    {
      id: "meta-llama/llama-3.3-70b",
      name: "Llama 3.3 70B",
      provider: "Meta",
      description: "Fast Execution - Rapid inference, cost-effective",
      pricing: { prompt: "0", completion: "0" },
      contextLength: 128000,
      isFree: true,
      priceTier: 0,
      avgCostPer1M: 0,
    },
  ];
}

export function sortModels(models: Model[], sortBy: string, favoriteIds: string[] = []): Model[] {
  const sorted = [...models];
  
  // Sort by the selected criteria
  let sortedModels: Model[];
  switch (sortBy) {
    case 'cheapest':
      sortedModels = sorted.sort((a, b) => a.avgCostPer1M - b.avgCostPer1M);
      break;
    case 'smartest':
      sortedModels = sorted.sort((a, b) => b.avgCostPer1M - a.avgCostPer1M);
      break;
    case 'context':
      sortedModels = sorted.sort((a, b) => b.contextLength - a.contextLength);
      break;
    default: // 'popular'
      sortedModels = sorted;
  }
  
  // Always put favorites at the top
  const favorites = sortedModels.filter(m => favoriteIds.includes(m.id));
  const nonFavorites = sortedModels.filter(m => !favoriteIds.includes(m.id));
  
  return [...favorites, ...nonFavorites];
}

export function filterModelsByCategory(models: Model[], category: string): Model[] {
  switch (category) {
    case 'free':
      return models.filter(m => m.isFree);
    
    case 'top-tier':
      return models.filter(m => 
        m.id.includes('gpt-4') || 
        m.id.includes('claude-3-opus') || 
        m.id.includes('claude-3.5-sonnet') ||
        m.id.includes('gemini-pro')
      );
    
    case 'coding':
      return models.filter(m => 
        m.id.includes('coder') || 
        m.id.includes('deepseek') || 
        m.id.includes('qwen') ||
        m.name.toLowerCase().includes('code')
      );
    
    case 'roleplay':
      return models.filter(m => 
        m.id.includes('mythomax') || 
        m.id.includes('nous-hermes') ||
        m.id.includes('mistral') ||
        m.id.includes('llama-3')
      );
    
    default: // 'all'
      return models;
  }
}
