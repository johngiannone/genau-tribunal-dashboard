-- Add monthly tracking fields to user_usage table
ALTER TABLE public.user_usage 
ADD COLUMN IF NOT EXISTS audits_this_month integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS files_this_month integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

-- Create index for efficient tier queries
CREATE INDEX IF NOT EXISTS idx_user_usage_tier ON public.user_usage(subscription_tier);

-- Create function to check if monthly reset is needed
CREATE OR REPLACE FUNCTION public.check_monthly_reset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Reset counters if last_reset_at is in a previous month
  IF DATE_TRUNC('month', NEW.last_reset_at) < DATE_TRUNC('month', NOW()) THEN
    NEW.audits_this_month := 0;
    NEW.files_this_month := 0;
    NEW.last_reset_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-reset monthly counters
DROP TRIGGER IF EXISTS trigger_monthly_reset ON public.user_usage;
CREATE TRIGGER trigger_monthly_reset
  BEFORE UPDATE ON public.user_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.check_monthly_reset();