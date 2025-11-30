-- Create query_cache table for caching routing decisions
CREATE TABLE IF NOT EXISTS public.query_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_hash TEXT NOT NULL UNIQUE,
  structured_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Create index on prompt_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_query_cache_prompt_hash ON public.query_cache(prompt_hash);

-- Create index on expires_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at ON public.query_cache(expires_at);

-- Enable RLS
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage cache
CREATE POLICY "Service role can manage query cache"
ON public.query_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Add cache_hit column to training_dataset
ALTER TABLE public.training_dataset
ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT false;

-- Create cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.query_cache
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON TABLE public.query_cache IS 'Caches query routing decisions to optimize repeated queries';
COMMENT ON COLUMN public.query_cache.prompt_hash IS 'MD5 hash of lowercase user prompt for fast lookup';
COMMENT ON COLUMN public.query_cache.structured_json IS 'Cached routing plan JSON from query-router';
COMMENT ON COLUMN public.query_cache.expires_at IS 'Cache expiration timestamp (24 hours from creation)';
COMMENT ON COLUMN public.training_dataset.cache_hit IS 'Whether the query routing used cached results';