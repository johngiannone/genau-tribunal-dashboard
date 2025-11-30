export type RoutingStrategyId = 'pure_cost' | 'latency_weighted' | 'reliability_weighted';

export interface ProviderMetrics {
  provider: string;
  avgLatency: number; // Average response time in ms
  errorRate: number; // Percentage of failed requests (0-100)
  totalRequests: number;
  successfulRequests: number;
  avgCost: number; // Average cost per request
}

export interface RoutingStrategy {
  id: RoutingStrategyId;
  name: string;
  description: string;
  weights: {
    cost: number; // 0-1
    latency: number; // 0-1
    reliability: number; // 0-1
  };
}

export interface ProviderScore {
  provider: string;
  score: number;
  breakdown: {
    costScore: number;
    latencyScore: number;
    reliabilityScore: number;
  };
}

export interface RoutingExperiment {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  strategies: RoutingStrategy[];
  traffic_split: Record<RoutingStrategyId, number>;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface StrategyPerformanceMetrics {
  strategy: RoutingStrategyId;
  totalAudits: number;
  avgCost: number;
  avgLatency: number;
  errorRate: number;
  userSatisfaction: number; // Based on ratings if available
  totalCost: number;
}
