-- Add structured_query column to training_dataset for storing parsed query intent
ALTER TABLE public.training_dataset
ADD COLUMN IF NOT EXISTS structured_query jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.training_dataset.structured_query IS 'Structured representation of user query intent and execution plan from query router';