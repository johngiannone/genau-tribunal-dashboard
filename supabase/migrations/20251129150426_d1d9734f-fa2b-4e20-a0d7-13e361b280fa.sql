-- Create auto_recharge_attempts table to track automatic credit top-ups
CREATE TABLE IF NOT EXISTS public.auto_recharge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.auto_recharge_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own recharge attempts
CREATE POLICY "Users can view own recharge attempts"
  ON public.auto_recharge_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all recharge attempts
CREATE POLICY "Admins can view all recharge attempts"
  ON public.auto_recharge_attempts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Service role can insert recharge attempts
CREATE POLICY "Service role can insert recharge attempts"
  ON public.auto_recharge_attempts
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Service role can update recharge attempts
CREATE POLICY "Service role can update recharge attempts"
  ON public.auto_recharge_attempts
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_auto_recharge_user_id ON public.auto_recharge_attempts(user_id);
CREATE INDEX idx_auto_recharge_status ON public.auto_recharge_attempts(status);