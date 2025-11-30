-- Add provider column to ai_models table for cost-aware routing
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'openrouter';

-- Add index for faster provider-based queries
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);

-- Add composite index for model lookups across providers
CREATE INDEX IF NOT EXISTS idx_ai_models_id_provider ON ai_models(id, provider);