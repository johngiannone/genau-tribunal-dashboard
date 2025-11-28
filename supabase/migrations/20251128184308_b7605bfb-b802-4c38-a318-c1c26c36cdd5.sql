-- Add monthly budget limit to user_usage
ALTER TABLE public.user_usage 
ADD COLUMN IF NOT EXISTS monthly_budget_limit numeric;

-- Add forecast alert type to enum
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'budget_forecast';

-- Create view for monthly cost summary
CREATE OR REPLACE VIEW public.monthly_cost_summary AS
SELECT 
  al.user_id,
  DATE_TRUNC('month', al.created_at) as month,
  COUNT(*) as audit_count,
  SUM((al.metadata->>'estimated_cost')::numeric) as total_cost,
  AVG((al.metadata->>'estimated_cost')::numeric) as avg_cost_per_audit,
  MIN(al.created_at) as first_audit,
  MAX(al.created_at) as last_audit
FROM public.activity_logs al
WHERE al.activity_type = 'audit_completed'
  AND al.metadata->>'estimated_cost' IS NOT NULL
GROUP BY al.user_id, DATE_TRUNC('month', al.created_at);

-- Grant access to the view
GRANT SELECT ON public.monthly_cost_summary TO authenticated;
GRANT SELECT ON public.monthly_cost_summary TO service_role;