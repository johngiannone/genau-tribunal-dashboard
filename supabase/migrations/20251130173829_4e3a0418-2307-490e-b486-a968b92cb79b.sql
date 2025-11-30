-- Add soft delete column to profiles
ALTER TABLE public.profiles 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient querying of deleted users
CREATE INDEX idx_profiles_deleted_at ON public.profiles(deleted_at);

-- Function to soft delete user (marks as deleted)
CREATE OR REPLACE FUNCTION public.soft_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark profile as deleted
  UPDATE public.profiles
  SET deleted_at = NOW()
  WHERE id = target_user_id;
  
  -- Mark user_usage as deleted (keep data but flag it)
  UPDATE public.user_usage
  SET account_status = 'disabled',
      updated_at = NOW()
  WHERE user_id = target_user_id;
END;
$$;

-- Function to restore user (removes deleted flag)
CREATE OR REPLACE FUNCTION public.restore_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user was deleted within 30 days
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_user_id
    AND deleted_at IS NOT NULL
    AND deleted_at > NOW() - INTERVAL '30 days'
  ) THEN
    -- Restore profile
    UPDATE public.profiles
    SET deleted_at = NULL
    WHERE id = target_user_id;
    
    -- Restore user_usage status
    UPDATE public.user_usage
    SET account_status = 'active',
        updated_at = NOW()
    WHERE user_id = target_user_id;
  ELSE
    RAISE EXCEPTION 'User cannot be restored (either not deleted or past 30-day window)';
  END IF;
END;
$$;

-- Function to permanently purge users deleted over 30 days ago
-- (This should be called by pg_cron or a scheduled job)
CREATE OR REPLACE FUNCTION public.purge_old_deleted_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete users whose deleted_at is older than 30 days
  DELETE FROM public.profiles
  WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days';
  
  -- Note: Cascading deletes will handle related records
END;
$$;