-- Add VPN/proxy detection columns to blocked_ips table
ALTER TABLE public.blocked_ips 
ADD COLUMN IF NOT EXISTS is_vpn boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_proxy boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_tor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fraud_score integer,
ADD COLUMN IF NOT EXISTS country_code text,
ADD COLUMN IF NOT EXISTS detection_data jsonb DEFAULT '{}'::jsonb;

-- Create index for fraud score queries
CREATE INDEX IF NOT EXISTS idx_blocked_ips_fraud_score ON public.blocked_ips(fraud_score);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_vpn ON public.blocked_ips(is_vpn) WHERE is_vpn = true;