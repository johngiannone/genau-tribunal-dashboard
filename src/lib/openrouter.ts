export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
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
  isFree: boolean;
}

export async function fetchOpenRouterModels(): Promise<Model[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    
    if (!response.ok) {
      throw new Error('Failed to fetch models from OpenRouter');
    }

    const data = await response.json();
    
    // Map the OpenRouter response to our Model format
    const models: Model[] = data.data.map((model: OpenRouterModel) => {
      const provider = model.id.split('/')[0];
      const isFree = model.pricing.prompt === "0" || model.pricing.prompt === "0.0";
      
      return {
        id: model.id,
        name: model.name,
        provider: provider.charAt(0).toUpperCase() + provider.slice(1),
        description: model.description || 'No description available',
        pricing: model.pricing,
        isFree,
      };
    });

    return models;
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
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
      isFree: false,
    },
    {
      id: "anthropic/claude-3.5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      description: "Deep Analysis Expert - Code understanding, nuanced critique",
      pricing: { prompt: "3", completion: "15" },
      isFree: false,
    },
    {
      id: "meta-llama/llama-3.3-70b",
      name: "Llama 3.3 70B",
      provider: "Meta",
      description: "Fast Execution - Rapid inference, cost-effective",
      pricing: { prompt: "0", completion: "0" },
      isFree: true,
    },
  ];
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
