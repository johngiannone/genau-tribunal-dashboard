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

    // Capture IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    console.log('Checking IP block status for:', ipAddress)

    // Check if IP is blocked
    const { data: blockedIP, error } = await supabaseClient
      .from('blocked_ips')
      .select('*')
      .eq('ip_address', ipAddress)
      .maybeSingle()

    if (error) {
      console.error('Error checking blocked IP:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to check IP status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Also check for country-level blocks
    let countryBlock = null;
    
    // First try to get country from existing detection
    if (blockedIP?.country_code) {
      // Check if there's an active country-level block
      const { data: countryBlockData } = await supabaseClient
        .from('blocked_ips')
        .select('*')
        .eq('ip_address', `COUNTRY_BLOCK_${blockedIP.country_code}`)
        .maybeSingle();

      if (countryBlockData) {
        countryBlock = countryBlockData;
      }
    }

    // Check country block first (takes precedence)
    if (countryBlock) {
      // Check if country block has expired
      if (!countryBlock.is_permanent && countryBlock.block_expires_at) {
        const expiresAt = new Date(countryBlock.block_expires_at);
        const now = new Date();
        
        if (expiresAt < now) {
          // Country block expired, clean it up
          await supabaseClient
            .from('blocked_ips')
            .delete()
            .eq('ip_address', countryBlock.ip_address);
          
          console.log('Country block expired, removed:', countryBlock.ip_address);
        } else {
          // Country block is active
          const hoursRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          return new Response(
            JSON.stringify({ 
              blocked: true,
              reason: `All signups from ${countryBlock.country_code} are temporarily blocked`,
              message: `Account creation is temporarily restricted from your country (${countryBlock.country_code}). Please try again in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`,
              blockType: 'country',
              is_permanent: false,
              expires_at: countryBlock.block_expires_at,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    }

    // If no block found, allow signup
    if (!blockedIP) {
      return new Response(
        JSON.stringify({ blocked: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Check if block has expired
    if (!blockedIP.is_permanent && blockedIP.block_expires_at) {
      const expiresAt = new Date(blockedIP.block_expires_at)
      const now = new Date()
      
      if (expiresAt < now) {
        // Block expired, delete it and allow signup
        await supabaseClient
          .from('blocked_ips')
          .delete()
          .eq('ip_address', ipAddress)
        
        console.log('IP block expired, removed:', ipAddress)
        return new Response(
          JSON.stringify({ blocked: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    // IP is actively blocked
    console.log('IP is blocked:', ipAddress, blockedIP)
    
    let message = 'Account creation is temporarily restricted from your IP address.'
    if (blockedIP.is_permanent) {
      message = 'Account creation is not available from your IP address. Please contact support if you believe this is an error.'
    } else if (blockedIP.block_expires_at) {
      const expiresAt = new Date(blockedIP.block_expires_at)
      const hoursRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))
      message = `Account creation is temporarily restricted from your IP address. Please try again in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`
    }

    return new Response(
      JSON.stringify({ 
        blocked: true,
        reason: blockedIP.blocked_reason,
        message,
        is_permanent: blockedIP.is_permanent,
        expires_at: blockedIP.block_expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in check-ip-block function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})