-- Create user_fingerprints table for browser fingerprint tracking
CREATE TABLE public.user_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  fingerprint_hash TEXT NOT NULL,
  screen_resolution TEXT,
  cpu_cores INTEGER,
  device_memory NUMERIC,
  timezone_offset INTEGER,
  webgl_renderer TEXT,
  canvas_hash TEXT,
  user_agent TEXT,
  platform TEXT,
  collected_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(fingerprint_hash, user_id)
);

-- Enable RLS
ALTER TABLE public.user_fingerprints ENABLE ROW LEVEL SECURITY;

-- Admins can view all fingerprints
CREATE POLICY "Admins can view all fingerprints"
ON public.user_fingerprints
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert fingerprints
CREATE POLICY "Service role can insert fingerprints"
ON public.user_fingerprints
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Users can view their own fingerprints
CREATE POLICY "Users can view own fingerprints"
ON public.user_fingerprints
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster fingerprint lookups
CREATE INDEX idx_fingerprints_hash ON public.user_fingerprints(fingerprint_hash);
CREATE INDEX idx_fingerprints_user ON public.user_fingerprints(user_id);
CREATE INDEX idx_fingerprints_collected ON public.user_fingerprints(collected_at DESC);