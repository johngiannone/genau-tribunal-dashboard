-- Update soft_delete_user function to include audit logging
CREATE OR REPLACE FUNCTION public.soft_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
  target_email text;
BEGIN
  -- Get the current admin user
  admin_user_id := auth.uid();
  
  -- Get the target user's email
  SELECT email INTO target_email FROM public.profiles WHERE id = target_user_id;
  
  -- Mark profile as deleted
  UPDATE public.profiles
  SET deleted_at = NOW()
  WHERE id = target_user_id;
  
  -- Mark user_usage as deleted (keep data but flag it)
  UPDATE public.user_usage
  SET account_status = 'disabled',
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Log the deletion action
  INSERT INTO public.activity_logs (
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    target_user_id,
    'admin_change',
    'User account soft-deleted by admin',
    jsonb_build_object(
      'action', 'user_deletion',
      'deleted_by_admin_id', admin_user_id,
      'target_user_email', target_email,
      'deletion_timestamp', NOW(),
      'restoration_deadline', NOW() + INTERVAL '30 days',
      'automated', false
    )
  );
END;
$$;

-- Update restore_user function to include audit logging
CREATE OR REPLACE FUNCTION public.restore_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
  target_email text;
  deleted_timestamp timestamptz;
BEGIN
  -- Get the current admin user
  admin_user_id := auth.uid();
  
  -- Get the target user's email and deletion timestamp
  SELECT email, deleted_at 
  INTO target_email, deleted_timestamp 
  FROM public.profiles 
  WHERE id = target_user_id;
  
  -- Check if user was deleted within 30 days
  IF deleted_timestamp IS NULL THEN
    RAISE EXCEPTION 'User is not deleted';
  END IF;
  
  IF deleted_timestamp <= NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'User cannot be restored (past 30-day window)';
  END IF;
  
  -- Restore profile
  UPDATE public.profiles
  SET deleted_at = NULL
  WHERE id = target_user_id;
  
  -- Restore user_usage status
  UPDATE public.user_usage
  SET account_status = 'active',
      updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- Log the restoration action
  INSERT INTO public.activity_logs (
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    target_user_id,
    'admin_change',
    'User account restored by admin',
    jsonb_build_object(
      'action', 'user_restoration',
      'restored_by_admin_id', admin_user_id,
      'target_user_email', target_email,
      'restoration_timestamp', NOW(),
      'was_deleted_at', deleted_timestamp,
      'days_until_purge_was', EXTRACT(DAY FROM (deleted_timestamp + INTERVAL '30 days' - NOW())),
      'automated', false
    )
  );
END;
$$;