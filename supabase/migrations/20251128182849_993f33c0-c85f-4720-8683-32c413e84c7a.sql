-- Create ai_models table for tracking model pricing
CREATE TABLE public.ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  input_price NUMERIC NOT NULL,
  output_price NUMERIC NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read model pricing
CREATE POLICY "Anyone can view model prices"
  ON public.ai_models
  FOR SELECT
  USING (true);

-- Only service role can update prices (via edge function)
CREATE POLICY "Service role can update prices"
  ON public.ai_models
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_ai_models_last_updated ON public.ai_models(last_updated DESC);