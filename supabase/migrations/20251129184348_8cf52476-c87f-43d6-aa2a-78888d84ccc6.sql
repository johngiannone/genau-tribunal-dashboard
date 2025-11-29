-- Add granular rating columns to training_dataset for feedback loop
ALTER TABLE training_dataset 
ADD COLUMN IF NOT EXISTS draft_a_rating integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS draft_b_rating integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS verdict_rating integer DEFAULT 0;

-- Add comment explaining the rating system
COMMENT ON COLUMN training_dataset.draft_a_rating IS 'Rating for Model A draft: 1 for thumbs up, -1 for thumbs down, 0 for unrated';
COMMENT ON COLUMN training_dataset.draft_b_rating IS 'Rating for Model B draft: 1 for thumbs up, -1 for thumbs down, 0 for unrated';
COMMENT ON COLUMN training_dataset.verdict_rating IS 'Rating for final verdict/synthesis: 1 for thumbs up, -1 for thumbs down, 0 for unrated';