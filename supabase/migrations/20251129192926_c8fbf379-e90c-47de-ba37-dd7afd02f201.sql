-- Add suspension tracking to user_usage (account_status already exists)
ALTER TABLE public.user_usage 
ADD COLUMN IF NOT EXISTS suspended_until timestamp with time zone;

-- Create function to check and suspend users after repeated unauthorized access
CREATE OR REPLACE FUNCTION public.check_and_suspend_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
  current_status account_status;
BEGIN
  -- Only process unauthorized_access events
  IF NEW.activity_type != 'unauthorized_access' THEN
    RETURN NEW;
  END IF;

  -- Count unauthorized access attempts in last 10 minutes
  SELECT COUNT(*) INTO attempt_count
  FROM public.activity_logs
  WHERE user_id = NEW.user_id
    AND activity_type = 'unauthorized_access'
    AND created_at >= NOW() - INTERVAL '10 minutes';

  -- Check current account status
  SELECT account_status INTO current_status
  FROM public.user_usage
  WHERE user_id = NEW.user_id;

  -- Suspend if 5 or more attempts and not already disabled
  IF attempt_count >= 5 AND current_status != 'disabled' THEN
    UPDATE public.user_usage
    SET 
      account_status = 'inactive',
      suspended_until = NOW() + INTERVAL '30 minutes'
    WHERE user_id = NEW.user_id;

    -- Log the suspension action
    INSERT INTO public.activity_logs (user_id, activity_type, description, metadata)
    VALUES (
      NEW.user_id,
      'admin_change',
      'Account automatically suspended due to repeated unauthorized access attempts',
      jsonb_build_object(
        'reason', 'brute_force_prevention',
        'attempt_count', attempt_count,
        'suspended_until', NOW() + INTERVAL '30 minutes',
        'automated', true
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS check_suspension_on_unauthorized_access ON public.activity_logs;

CREATE TRIGGER check_suspension_on_unauthorized_access
AFTER INSERT ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_and_suspend_user();