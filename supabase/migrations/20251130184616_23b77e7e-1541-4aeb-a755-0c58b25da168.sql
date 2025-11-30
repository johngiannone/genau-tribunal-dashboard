-- Create routing_experiments table for A/B test configuration
CREATE TABLE IF NOT EXISTS routing_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed
  strategies JSONB NOT NULL, -- Array of strategy configs with weights
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  traffic_split JSONB NOT NULL, -- Percentage allocation per strategy
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on routing_experiments
ALTER TABLE routing_experiments ENABLE ROW LEVEL SECURITY;

-- Admin-only access to experiments
CREATE POLICY "Admins can manage routing experiments"
  ON routing_experiments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add index for active experiments
CREATE INDEX idx_routing_experiments_status ON routing_experiments(status);

-- Insert default A/B test configuration
INSERT INTO routing_experiments (name, description, strategies, traffic_split, status)
VALUES (
  'Primary Routing Strategy Test',
  'Compare cost-optimized vs latency-optimized vs reliability-weighted routing',
  '[
    {"id": "pure_cost", "name": "Pure Cost", "description": "Always select cheapest provider"},
    {"id": "latency_weighted", "name": "Latency Weighted", "description": "Balance cost with response time (70% cost, 30% latency)"},
    {"id": "reliability_weighted", "name": "Reliability Weighted", "description": "Prioritize uptime and error rates (60% cost, 20% latency, 20% reliability)"}
  ]'::jsonb,
  '{"pure_cost": 33, "latency_weighted": 33, "reliability_weighted": 34}'::jsonb,
  'active'
);