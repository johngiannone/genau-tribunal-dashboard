-- Migration: Update training_dataset schema to support individual model columns and anonymous inserts

-- 1. Add new columns for individual model tracking
ALTER TABLE public.training_dataset
  ADD COLUMN draft_a_model TEXT,
  ADD COLUMN draft_a_response TEXT,
  ADD COLUMN draft_b_model TEXT,
  ADD COLUMN draft_b_response TEXT,
  ADD COLUMN verdict_model TEXT,
  ADD COLUMN verdict_response TEXT;

-- 2. Migrate existing data to new columns
UPDATE public.training_dataset
SET 
  draft_a_response = rejected_response_a,
  draft_b_response = rejected_response_b,
  verdict_response = chosen_response,
  draft_a_model = COALESCE(
    model_config->>'slot_1'::text,
    (model_config->'slot_1'->>'id')::text,
    'unknown'
  ),
  draft_b_model = COALESCE(
    model_config->>'slot_2'::text,
    (model_config->'slot_2'->>'id')::text,
    'unknown'
  ),
  verdict_model = 'deepseek/deepseek-r1'
WHERE draft_a_model IS NULL;

-- 3. Drop old columns (keep model_config for now as reference)
ALTER TABLE public.training_dataset
  DROP COLUMN rejected_response_a,
  DROP COLUMN rejected_response_b,
  DROP COLUMN chosen_response;

-- 4. Make user_id nullable for anonymous usage
ALTER TABLE public.training_dataset
  ALTER COLUMN user_id DROP NOT NULL;

-- 5. Drop existing RLS policies
DROP POLICY IF EXISTS "Users can insert their own training data" ON public.training_dataset;
DROP POLICY IF EXISTS "Users can view their own training data" ON public.training_dataset;
DROP POLICY IF EXISTS "Users can update their own training data" ON public.training_dataset;
DROP POLICY IF EXISTS "Users can delete their own training data" ON public.training_dataset;

-- 6. Create new RLS policies

-- Allow anonymous and authenticated users to INSERT
CREATE POLICY "Public can insert training data"
  ON public.training_dataset
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can SELECT their own rows
CREATE POLICY "Users can view own training data"
  ON public.training_dataset
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can SELECT all rows (for admin export)
CREATE POLICY "Service role can view all training data"
  ON public.training_dataset
  FOR SELECT
  TO service_role
  USING (true);

-- Users can UPDATE their own rows (for ratings)
CREATE POLICY "Users can update own training data"
  ON public.training_dataset
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can DELETE their own rows
CREATE POLICY "Users can delete own training data"
  ON public.training_dataset
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Add helpful comments
COMMENT ON COLUMN public.training_dataset.draft_a_model IS 'Model ID/name for first draft (e.g., openai/gpt-4o)';
COMMENT ON COLUMN public.training_dataset.draft_b_model IS 'Model ID/name for second draft';
COMMENT ON COLUMN public.training_dataset.verdict_model IS 'Model ID/name used for synthesis/verdict';
COMMENT ON COLUMN public.training_dataset.user_id IS 'User ID - nullable to support anonymous training data collection';