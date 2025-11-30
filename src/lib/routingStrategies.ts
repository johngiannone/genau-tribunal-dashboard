import { RoutingStrategy, RoutingStrategyId, ProviderMetrics, ProviderScore } from "@/types/routing";

// Define available routing strategies with their weighting profiles
export const ROUTING_STRATEGIES: Record<RoutingStrategyId, RoutingStrategy> = {
  pure_cost: {
    id: 'pure_cost',
    name: 'Pure Cost Optimization',
    description: 'Always select the cheapest available provider regardless of other factors',
    weights: {
      cost: 1.0,
      latency: 0.0,
      reliability: 0.0
    }
  },
  latency_weighted: {
    id: 'latency_weighted',
    name: 'Latency-Weighted Routing',
    description: 'Balance cost with response speed (70% cost, 30% latency)',
    weights: {
      cost: 0.7,
      latency: 0.3,
      reliability: 0.0
    }
  },
  reliability_weighted: {
    id: 'reliability_weighted',
    name: 'Reliability-Weighted Routing',
    description: 'Prioritize provider uptime and success rates (60% cost, 20% latency, 20% reliability)',
    weights: {
      cost: 0.6,
      latency: 0.2,
      reliability: 0.2
    }
  }
};

/**
 * Calculate provider scores based on routing strategy
 * Lower score = better (for cost minimization)
 */
export function calculateProviderScores(
  providers: ProviderMetrics[],
  strategy: RoutingStrategy
): ProviderScore[] {
  if (providers.length === 0) return [];

  // Normalize metrics to 0-1 scale
  const maxCost = Math.max(...providers.map(p => p.avgCost), 0.001);
  const maxLatency = Math.max(...providers.map(p => p.avgLatency), 1);
  const maxErrorRate = Math.max(...providers.map(p => p.errorRate), 0.001);

  const scores: ProviderScore[] = providers.map(provider => {
    // Normalize metrics (lower is better)
    const normalizedCost = provider.avgCost / maxCost;
    const normalizedLatency = provider.avgLatency / maxLatency;
    const normalizedErrorRate = provider.errorRate / (maxErrorRate || 1);

    // Calculate component scores
    const costScore = normalizedCost * strategy.weights.cost;
    const latencyScore = normalizedLatency * strategy.weights.latency;
    const reliabilityScore = normalizedErrorRate * strategy.weights.reliability;

    // Combined score (lower is better)
    const totalScore = costScore + latencyScore + reliabilityScore;

    return {
      provider: provider.provider,
      score: totalScore,
      breakdown: {
        costScore,
        latencyScore,
        reliabilityScore
      }
    };
  });

  // Sort by score (best first)
  return scores.sort((a, b) => a.score - b.score);
}

/**
 * Select provider based on routing strategy
 * Returns the optimal provider based on weighted scoring
 */
export function selectProviderByStrategy(
  providers: ProviderMetrics[],
  strategy: RoutingStrategy
): string | null {
  const scores = calculateProviderScores(providers, strategy);
  return scores.length > 0 ? scores[0].provider : null;
}

/**
 * Randomly assign a routing strategy based on traffic split percentages
 */
export function assignRoutingStrategy(
  trafficSplit: Record<RoutingStrategyId, number>
): RoutingStrategyId {
  const rand = Math.random() * 100;
  let cumulative = 0;

  for (const [strategyId, percentage] of Object.entries(trafficSplit)) {
    cumulative += percentage;
    if (rand <= cumulative) {
      return strategyId as RoutingStrategyId;
    }
  }

  // Fallback to pure_cost if something goes wrong
  return 'pure_cost';
}

/**
 * Get provider priority list based on strategy and historical metrics
 */
export function getProviderPriorityByStrategy(
  providerMetrics: ProviderMetrics[],
  strategy: RoutingStrategy
): string[] {
  const scores = calculateProviderScores(providerMetrics, strategy);
  return scores.map(s => s.provider);
}
