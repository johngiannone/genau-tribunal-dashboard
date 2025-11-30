-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write system settings
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default provider configuration
INSERT INTO public.system_settings (key, value)
VALUES (
  'ai_provider_config',
  '{
    "primary_provider": "openrouter",
    "fallback_enabled": true,
    "fallback_provider": "together",
    "auto_fallback": true,
    "manual_override": false
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX idx_system_settings_key ON public.system_settings(key);