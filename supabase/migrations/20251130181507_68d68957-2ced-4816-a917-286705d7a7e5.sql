-- Add estimated_cost column to activity_logs table for cost tracking
ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC DEFAULT 0.00;