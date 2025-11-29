-- Create blocked IPs table
CREATE TABLE public.blocked_ips (
  ip_address text PRIMARY KEY,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_reason text NOT NULL,
  associated_user_id uuid,
  block_expires_at timestamp with time zone,
  is_permanent boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on blocked_ips
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Allow service role and admins to manage blocked IPs
CREATE POLICY "Service role can manage blocked IPs"
ON public.blocked_ips
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view blocked IPs"
ON public.blocked_ips
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Function to block IP addresses when users are suspended or banned
CREATE OR REPLACE FUNCTION public.block_user_ip_on_suspension()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_ip text;
  block_duration interval;
  is_permanent_block boolean;
BEGIN
  -- Only process suspension/ban events
  IF NEW.activity_type != 'admin_change' THEN
    RETURN NEW;
  END IF;

  -- Check if this is an automated suspension or ban
  IF NEW.metadata->>'automated' = 'true' THEN
    -- Get the user's most recent IP from activity_logs
    SELECT ip_address INTO user_ip
    FROM public.activity_logs
    WHERE user_id = NEW.user_id
      AND ip_address IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1;

    -- If we found an IP, block it
    IF user_ip IS NOT NULL THEN
      -- Determine block duration based on the action
      IF NEW.description LIKE '%auto-banned%' THEN
        -- Permanent block for bans
        is_permanent_block := true;
        block_duration := NULL;
      ELSIF NEW.metadata->>'reason' = 'brute_force_prevention' THEN
        -- 24-hour block for brute force suspensions
        is_permanent_block := false;
        block_duration := INTERVAL '24 hours';
      ELSE
        -- Default 1-hour block
        is_permanent_block := false;
        block_duration := INTERVAL '1 hour';
      END IF;

      -- Insert or update the blocked IP
      INSERT INTO public.blocked_ips (
        ip_address,
        blocked_reason,
        associated_user_id,
        block_expires_at,
        is_permanent,
        metadata
      )
      VALUES (
        user_ip,
        NEW.description,
        NEW.user_id,
        CASE WHEN is_permanent_block THEN NULL ELSE NOW() + block_duration END,
        is_permanent_block,
        jsonb_build_object(
          'auto_blocked', true,
          'trigger_event', NEW.description,
          'blocked_from', 'suspension_trigger'
        )
      )
      ON CONFLICT (ip_address) DO UPDATE
      SET
        blocked_at = NOW(),
        blocked_reason = EXCLUDED.blocked_reason,
        block_expires_at = EXCLUDED.block_expires_at,
        is_permanent = EXCLUDED.is_permanent OR public.blocked_ips.is_permanent,
        metadata = public.blocked_ips.metadata || EXCLUDED.metadata;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to block IPs on suspension/ban
DROP TRIGGER IF EXISTS block_ip_on_suspension ON public.activity_logs;

CREATE TRIGGER block_ip_on_suspension
AFTER INSERT ON public.activity_logs
FOR EACH ROW
EXECUTE FUNCTION public.block_user_ip_on_suspension();