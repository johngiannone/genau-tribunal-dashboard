-- Add enable_model_recommendations column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN enable_model_recommendations BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.enable_model_recommendations IS 'Whether to show AI model recommendations before audits';