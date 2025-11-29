-- Create behavioral_signals table for bot detection
CREATE TABLE public.behavioral_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Mouse behavior metrics
  avg_mouse_velocity NUMERIC,
  mouse_velocity_variance NUMERIC,
  avg_mouse_acceleration NUMERIC,
  mouse_path_curvature NUMERIC,
  total_mouse_events INTEGER DEFAULT 0,
  
  -- Keystroke behavior metrics
  avg_keystroke_interval NUMERIC,
  keystroke_interval_variance NUMERIC,
  total_keystroke_events INTEGER DEFAULT 0,
  
  -- Click behavior metrics
  time_to_first_click NUMERIC,
  avg_click_interval NUMERIC,
  total_click_events INTEGER DEFAULT 0,
  click_accuracy_score NUMERIC,
  
  -- Bot likelihood assessment
  bot_likelihood_score INTEGER DEFAULT 0,
  bot_indicators JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  collected_at TIMESTAMPTZ DEFAULT now(),
  last_updated TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.behavioral_signals ENABLE ROW LEVEL SECURITY;

-- Admins can view all behavioral data
CREATE POLICY "Admins can view all behavioral signals"
ON public.behavioral_signals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert and update behavioral signals
CREATE POLICY "Service role can manage behavioral signals"
ON public.behavioral_signals
FOR ALL
TO authenticated
USING (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Users can view their own behavioral data
CREATE POLICY "Users can view own behavioral signals"
ON public.behavioral_signals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_behavioral_session ON public.behavioral_signals(session_id);
CREATE INDEX idx_behavioral_user ON public.behavioral_signals(user_id);
CREATE INDEX idx_behavioral_bot_score ON public.behavioral_signals(bot_likelihood_score DESC);
CREATE INDEX idx_behavioral_collected ON public.behavioral_signals(collected_at DESC);