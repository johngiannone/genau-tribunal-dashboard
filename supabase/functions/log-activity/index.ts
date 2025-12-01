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
    if (!authHeader) {
      // No auth header - silently skip logging for unauthenticated requests
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      // Invalid token - silently skip logging
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { activity_type, description, metadata } = await req.json()

    if (!activity_type || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: activity_type, description' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Capture IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    const userAgent = req.headers.get('user-agent') || null
    
    // Capture country from cookie for Stripe routing
    const cookies = req.headers.get('cookie') || '';
    const countryCookie = cookies.split(';').find(c => c.trim().startsWith('user_country='));
    const userCountry = countryCookie ? countryCookie.split('=')[1].trim() : null;
    
    // Capture additional headers for Phase 1: Enhanced Header Collection
    const referer = req.headers.get('referer') || null
    const origin = req.headers.get('origin') || null
    const acceptLanguage = req.headers.get('accept-language') || null
    
    // Enrich metadata with additional headers and country
    const enrichedMetadata = {
      ...metadata,
      referer,
      origin,
      acceptLanguage,
      country: userCountry, // Add country for Stripe routing
    }

    // Insert activity log with enriched metadata
    const { error: insertError } = await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        activity_type,
        description,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: enrichedMetadata
      })

    if (insertError) {
      console.error('Failed to insert activity log:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to log activity' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in log-activity function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
