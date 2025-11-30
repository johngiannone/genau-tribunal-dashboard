-- Drop existing primary key constraint on ai_models.id
ALTER TABLE ai_models DROP CONSTRAINT IF EXISTS ai_models_pkey;

-- Add composite primary key on (id, provider) for multi-provider support
ALTER TABLE ai_models ADD PRIMARY KEY (id, provider);