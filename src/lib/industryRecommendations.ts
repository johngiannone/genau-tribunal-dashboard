export type Industry = "legal" | "medical" | "technology" | "finance" | "marketing";

export interface ModelRecommendation {
  modelId: string;
  reason: string;
}

export interface IndustryRecommendations {
  chairman: ModelRecommendation;
  critic: ModelRecommendation;
  architect: ModelRecommendation;
  reporter?: ModelRecommendation;
  speedster?: ModelRecommendation;
}

export const industryRecommendations: Record<Industry, IndustryRecommendations> = {
  legal: {
    chairman: {
      modelId: "openai/gpt-4o",
      reason: "Superior reasoning for legal analysis",
    },
    critic: {
      modelId: "anthropic/claude-3-opus",
      reason: "Excellent at identifying legal risks and edge cases",
    },
    architect: {
      modelId: "mistralai/mistral-large-latest",
      reason: "European data compliance and legal expertise",
    },
    reporter: {
      modelId: "x-ai/grok-2-1212",
      reason: "Clear legal summaries and documentation",
    },
    speedster: {
      modelId: "meta-llama/llama-3.3-70b-instruct",
      reason: "Fast contract review and clause analysis",
    },
  },
  medical: {
    chairman: {
      modelId: "openai/gpt-4o",
      reason: "Medical knowledge and diagnostic reasoning",
    },
    critic: {
      modelId: "anthropic/claude-3.5-sonnet",
      reason: "Safety-focused analysis for medical decisions",
    },
    architect: {
      modelId: "google/gemini-pro-1.5",
      reason: "Large context for patient history and records",
    },
    reporter: {
      modelId: "x-ai/grok-2-1212",
      reason: "Clinical documentation and reporting",
    },
    speedster: {
      modelId: "meta-llama/llama-3.3-70b-instruct",
      reason: "Quick triage and preliminary assessments",
    },
  },
  technology: {
    chairman: {
      modelId: "openai/gpt-4o",
      reason: "Technical problem-solving and architecture",
    },
    critic: {
      modelId: "anthropic/claude-3.5-sonnet",
      reason: "Code review and security analysis",
    },
    architect: {
      modelId: "deepseek/deepseek-coder",
      reason: "Specialized in software architecture and coding",
    },
    reporter: {
      modelId: "qwen/qwen-2.5-coder-32b-instruct",
      reason: "Technical documentation and API specs",
    },
    speedster: {
      modelId: "meta-llama/llama-3.3-70b-instruct",
      reason: "Rapid prototyping and code generation",
    },
  },
  finance: {
    chairman: {
      modelId: "openai/gpt-4o",
      reason: "Financial modeling and market analysis",
    },
    critic: {
      modelId: "anthropic/claude-3-opus",
      reason: "Risk assessment and compliance checking",
    },
    architect: {
      modelId: "mistralai/mistral-large-latest",
      reason: "Quantitative analysis and strategy",
    },
    reporter: {
      modelId: "x-ai/grok-2-1212",
      reason: "Financial reports and investor communications",
    },
    speedster: {
      modelId: "meta-llama/llama-3.3-70b-instruct",
      reason: "Real-time market data processing",
    },
  },
  marketing: {
    chairman: {
      modelId: "openai/gpt-4o",
      reason: "Creative strategy and campaign planning",
    },
    critic: {
      modelId: "anthropic/claude-3.5-sonnet",
      reason: "Brand safety and message consistency",
    },
    architect: {
      modelId: "google/gemini-pro-1.5",
      reason: "Multi-channel campaign design",
    },
    reporter: {
      modelId: "x-ai/grok-2-1212",
      reason: "Compelling copy and content creation",
    },
    speedster: {
      modelId: "meta-llama/llama-3.3-70b-instruct",
      reason: "Rapid A/B testing and iteration",
    },
  },
};

export function getRecommendedModels(industry: Industry | null): string[] {
  if (!industry || !industryRecommendations[industry]) return [];

  const recommendations = industryRecommendations[industry];
  return [
    recommendations.chairman.modelId,
    recommendations.critic.modelId,
    recommendations.architect.modelId,
    recommendations.reporter?.modelId,
    recommendations.speedster?.modelId,
  ].filter((id): id is string => id !== undefined);
}

export function getRecommendationReason(industry: Industry | null, modelId: string): string | null {
  if (!industry || !industryRecommendations[industry]) return null;

  const recommendations = industryRecommendations[industry];
  const allRecommendations = [
    recommendations.chairman,
    recommendations.critic,
    recommendations.architect,
    recommendations.reporter,
    recommendations.speedster,
  ].filter((r): r is ModelRecommendation => r !== undefined);

  const match = allRecommendations.find((r) => r.modelId === modelId);
  return match?.reason || null;
}
