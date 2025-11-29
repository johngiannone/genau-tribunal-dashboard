import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null;
    
    // Try to get authenticated user (optional for fingerprinting)
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
      if (user) {
        userId = user.id;
      }
    }

    const {
      fingerprintHash,
      screenResolution,
      cpuCores,
      deviceMemory,
      timezoneOffset,
      webglRenderer,
      canvasHash,
      userAgent,
      platform,
      sessionId,
      metadata
    } = await req.json()

    if (!fingerprintHash) {
      return new Response(
        JSON.stringify({ error: 'Missing fingerprint_hash' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if this fingerprint already exists for another user (ban evasion detection)
    const { data: existingFingerprints, error: checkError } = await supabaseClient
      .from('user_fingerprints')
      .select('user_id, collected_at')
      .eq('fingerprint_hash', fingerprintHash)
      .not('user_id', 'is', null)

    if (checkError) {
      console.error('Error checking existing fingerprints:', checkError)
    }

    let banEvasionDetected = false;
    if (existingFingerprints && existingFingerprints.length > 0 && userId) {
      // Check if any existing fingerprint belongs to a different user
      const differentUser = existingFingerprints.find(fp => fp.user_id !== userId);
      if (differentUser) {
        banEvasionDetected = true;
        console.warn('⚠️ Ban evasion detected! Fingerprint collision:', {
          fingerprintHash,
          currentUserId: userId,
          existingUserId: differentUser.user_id
        });
      }
    }

    // Insert or update fingerprint
    const { error: insertError } = await supabaseClient
      .from('user_fingerprints')
      .upsert({
        user_id: userId,
        session_id: sessionId || null,
        fingerprint_hash: fingerprintHash,
        screen_resolution: screenResolution,
        cpu_cores: cpuCores,
        device_memory: deviceMemory,
        timezone_offset: timezoneOffset,
        webgl_renderer: webglRenderer,
        canvas_hash: canvasHash,
        user_agent: userAgent,
        platform: platform,
        metadata: {
          ...metadata,
          ban_evasion_detected: banEvasionDetected
        }
      }, {
        onConflict: 'fingerprint_hash,user_id',
        ignoreDuplicates: false
      })

    if (insertError) {
      console.error('Failed to store fingerprint:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store fingerprint' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        banEvasionDetected 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in store-fingerprint function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
