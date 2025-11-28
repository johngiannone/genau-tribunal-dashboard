-- Add cost threshold columns to user_usage table
ALTER TABLE public.user_usage 
ADD COLUMN IF NOT EXISTS daily_cost_threshold numeric,
ADD COLUMN IF NOT EXISTS per_audit_cost_threshold numeric;

-- Create enum for alert types
CREATE TYPE public.alert_type AS ENUM ('daily_threshold', 'audit_threshold');

-- Create cost_alerts table
CREATE TABLE public.cost_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  alert_type alert_type NOT NULL,
  estimated_cost numeric NOT NULL,
  threshold numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notified_via_email boolean DEFAULT false,
  email_sent_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view all cost alerts"
ON public.cost_alerts
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert alerts (service role)
CREATE POLICY "Service role can insert alerts"
ON public.cost_alerts
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Admins can update alert email status
CREATE POLICY "Admins can update alerts"
ON public.cost_alerts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));