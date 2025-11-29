-- Add council_source column to training_dataset table to track A/B testing
ALTER TABLE public.training_dataset
ADD COLUMN council_source text CHECK (council_source IN ('recommended', 'user_configured', 'default'));

-- Add index for faster A/B testing queries
CREATE INDEX idx_training_dataset_council_source ON public.training_dataset(council_source);

-- Add comment to explain the column
COMMENT ON COLUMN public.training_dataset.council_source IS 'Tracks whether the council was AI-recommended, user-configured, or default for A/B testing comparison';