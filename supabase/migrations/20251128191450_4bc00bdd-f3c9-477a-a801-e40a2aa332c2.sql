-- Create security_logs table for tracking moderation violations
CREATE TABLE public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  flag_category TEXT NOT NULL,
  flagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view all security logs"
  ON public.security_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert security logs
CREATE POLICY "Service role can insert security logs"
  ON public.security_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_flagged_at ON public.security_logs(flagged_at DESC);