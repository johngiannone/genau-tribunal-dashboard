-- Update system_settings to use provider_priority array for 3-provider support
DO $$
BEGIN
  -- Check if ai_provider_config exists and update it to new schema
  UPDATE system_settings
  SET value = jsonb_build_object(
    'provider_priority', jsonb_build_array('openrouter', 'together', 'basten'),
    'fallback_enabled', COALESCE((value->>'fallback_enabled')::boolean, true),
    'auto_fallback', COALESCE((value->>'auto_fallback')::boolean, true),
    'manual_override', false
  )
  WHERE key = 'ai_provider_config';
  
  -- If no config exists, create default
  IF NOT FOUND THEN
    INSERT INTO system_settings (key, value)
    VALUES (
      'ai_provider_config',
      jsonb_build_object(
        'provider_priority', jsonb_build_array('openrouter', 'together', 'basten'),
        'fallback_enabled', true,
        'auto_fallback', true,
        'manual_override', false
      )
    );
  END IF;
END $$;