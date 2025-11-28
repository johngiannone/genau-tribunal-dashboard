-- Add ban tracking fields to user_usage table
ALTER TABLE public.user_usage
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Create function to check and auto-ban users with repeated violations
CREATE OR REPLACE FUNCTION public.check_and_auto_ban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  violation_count INTEGER;
  user_banned BOOLEAN;
BEGIN
  -- Check if user is already banned
  SELECT is_banned INTO user_banned
  FROM public.user_usage
  WHERE user_id = NEW.user_id;
  
  -- If already banned, skip
  IF user_banned THEN
    RETURN NEW;
  END IF;
  
  -- Count violations in last 24 hours for this user
  SELECT COUNT(*) INTO violation_count
  FROM public.security_logs
  WHERE user_id = NEW.user_id
    AND flagged_at >= NOW() - INTERVAL '24 hours';
  
  -- If 3 or more violations, ban the user
  IF violation_count >= 3 THEN
    UPDATE public.user_usage
    SET 
      is_banned = true,
      banned_at = NOW(),
      ban_reason = format('Auto-banned: %s security violations in 24 hours', violation_count)
    WHERE user_id = NEW.user_id;
    
    -- Log activity
    INSERT INTO public.activity_logs (user_id, activity_type, description, metadata)
    VALUES (
      NEW.user_id,
      'admin_change',
      'User auto-banned for repeated security violations',
      jsonb_build_object(
        'violation_count', violation_count,
        'ban_reason', format('Auto-banned: %s security violations in 24 hours', violation_count),
        'automated', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run auto-ban check after each security log insert
DROP TRIGGER IF EXISTS trigger_check_auto_ban ON public.security_logs;
CREATE TRIGGER trigger_check_auto_ban
  AFTER INSERT ON public.security_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_auto_ban();

-- Create index for faster ban status checks
CREATE INDEX IF NOT EXISTS idx_user_usage_is_banned ON public.user_usage(is_banned, user_id);