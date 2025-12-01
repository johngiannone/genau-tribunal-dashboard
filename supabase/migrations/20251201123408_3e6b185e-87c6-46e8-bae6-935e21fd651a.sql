-- Create table to track deletion warning emails sent
CREATE TABLE IF NOT EXISTS public.deletion_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL, -- 'audit_history', 'conversations', 'activity_logs'
  warning_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_deletion_date DATE NOT NULL,
  UNIQUE(user_id, data_type, scheduled_deletion_date)
);

-- Enable RLS
ALTER TABLE public.deletion_warnings ENABLE ROW LEVEL SECURITY;

-- Only service role can manage deletion warnings
CREATE POLICY "Service role can manage deletion warnings"
  ON public.deletion_warnings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add index for performance
CREATE INDEX idx_deletion_warnings_user_id ON public.deletion_warnings(user_id);
CREATE INDEX idx_deletion_warnings_sent_at ON public.deletion_warnings(warning_sent_at);

COMMENT ON TABLE public.deletion_warnings IS 'Tracks deletion warning emails sent to users about upcoming data cleanup';
