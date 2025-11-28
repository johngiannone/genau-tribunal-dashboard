-- Create a simpler version that just logs and stores ban info
-- Email sending will be handled separately via edge function
CREATE OR REPLACE FUNCTION public.check_and_auto_ban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  violation_count INTEGER;
  user_banned BOOLEAN;
  violation_categories TEXT;
  ban_reason_text TEXT;
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
  
  -- Get all unique categories from recent violations
  SELECT string_agg(DISTINCT flag_category, ', ')
  INTO violation_categories
  FROM public.security_logs
  WHERE user_id = NEW.user_id
    AND flagged_at >= NOW() - INTERVAL '24 hours';
  
  -- If 3 or more violations, ban the user
  IF violation_count >= 3 THEN
    ban_reason_text := format('Auto-banned: %s security violations in 24 hours', violation_count);
    
    UPDATE public.user_usage
    SET 
      is_banned = true,
      banned_at = NOW(),
      ban_reason = ban_reason_text
    WHERE user_id = NEW.user_id;
    
    -- Log activity with ban details for email notification
    INSERT INTO public.activity_logs (user_id, activity_type, description, metadata)
    VALUES (
      NEW.user_id,
      'admin_change',
      'User auto-banned for repeated security violations',
      jsonb_build_object(
        'violation_count', violation_count,
        'ban_reason', ban_reason_text,
        'violation_categories', violation_categories,
        'automated', true,
        'send_email', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;