-- Add cost tracking fields to analytics_events table
ALTER TABLE public.analytics_events 
ADD COLUMN input_tokens INTEGER DEFAULT 0,
ADD COLUMN output_tokens INTEGER DEFAULT 0,
ADD COLUMN cost NUMERIC(10, 6) DEFAULT 0.00;