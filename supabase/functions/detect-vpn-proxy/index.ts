import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IPQualityScoreResponse {
  success: boolean
  message?: string
  fraud_score: number
  country_code: string
  region: string
  city: string
  ISP: string
  ASN: number
  organization: string
  is_crawler: boolean
  timezone: string
  mobile: boolean
  host: string
  proxy: boolean
  vpn: boolean
  tor: boolean
  active_vpn: boolean
  active_tor: boolean
  recent_abuse: boolean
  bot_status: boolean
  connection_type: string
  abuse_velocity: string
  zip_code: string
  latitude: number
  longitude: number
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

    // Get IP address from request headers or body
    let ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                    req.headers.get('x-real-ip') || 
                    'unknown'

    // Allow IP to be passed in request body for testing
    const body = await req.json().catch(() => ({}))
    if (body.ip_address) {
      ipAddress = body.ip_address
    }

    console.log('Checking IP for VPN/proxy:', ipAddress)

    // Check if we have a cached result for this IP
    const { data: cachedResult } = await supabaseClient
      .from('blocked_ips')
      .select('*')
      .eq('ip_address', ipAddress)
      .maybeSingle()

    // If cached and detection was done within last 24 hours, return cached result
    if (cachedResult && cachedResult.detection_data) {
      const detectionAge = Date.now() - new Date(cachedResult.blocked_at).getTime()
      const twentyFourHours = 24 * 60 * 60 * 1000
      
      if (detectionAge < twentyFourHours) {
        console.log('Returning cached VPN/proxy detection for:', ipAddress)
        return new Response(
          JSON.stringify({
            suspicious: cachedResult.is_vpn || cachedResult.is_proxy || cachedResult.is_tor || (cachedResult.fraud_score && cachedResult.fraud_score > 75),
            is_vpn: cachedResult.is_vpn,
            is_proxy: cachedResult.is_proxy,
            is_tor: cachedResult.is_tor,
            fraud_score: cachedResult.fraud_score,
            country_code: cachedResult.country_code,
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    // Call IPQualityScore API
    const apiKey = Deno.env.get('IPQUALITYSCORE_API_KEY')
    
    if (!apiKey) {
      console.error('IPQualityScore API key not configured')
      return new Response(
        JSON.stringify({ 
          error: 'VPN detection service not configured',
          suspicious: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Make request to IPQualityScore
    const ipqsUrl = `https://ipqualityscore.com/api/json/ip/${apiKey}/${encodeURIComponent(ipAddress)}?strictness=1&allow_public_access_points=true&fast=true&mobile=true`
    
    console.log('Calling IPQualityScore API for:', ipAddress)
    const response = await fetch(ipqsUrl)
    
    if (!response.ok) {
      throw new Error(`IPQualityScore API error: ${response.status}`)
    }

    const data: IPQualityScoreResponse = await response.json()
    
    if (!data.success) {
      throw new Error(`IPQualityScore failed: ${data.message || 'Unknown error'}`)
    }

    console.log('IPQualityScore response:', {
      ip: ipAddress,
      vpn: data.vpn,
      proxy: data.proxy,
      tor: data.tor,
      fraud_score: data.fraud_score
    })

    // Determine if IP is suspicious
    const isSuspicious = data.vpn || data.proxy || data.tor || data.fraud_score > 75 || data.recent_abuse || data.bot_status

    // Store or update detection results
    const detectionData = {
      fraud_score: data.fraud_score,
      country_code: data.country_code,
      region: data.region,
      city: data.city,
      isp: data.ISP,
      asn: data.ASN,
      organization: data.organization,
      is_crawler: data.is_crawler,
      mobile: data.mobile,
      connection_type: data.connection_type,
      recent_abuse: data.recent_abuse,
      bot_status: data.bot_status,
      abuse_velocity: data.abuse_velocity,
      detected_at: new Date().toISOString()
    }

    // If suspicious and not already blocked, create a record
    if (isSuspicious && !cachedResult) {
      let blockReason = 'Suspicious IP detected: '
      const reasons = []
      if (data.vpn) reasons.push('VPN')
      if (data.proxy) reasons.push('Proxy')
      if (data.tor) reasons.push('Tor')
      if (data.fraud_score > 75) reasons.push(`High fraud score (${data.fraud_score})`)
      if (data.recent_abuse) reasons.push('Recent abuse')
      if (data.bot_status) reasons.push('Bot detected')
      
      blockReason += reasons.join(', ')

      await supabaseClient
        .from('blocked_ips')
        .insert({
          ip_address: ipAddress,
          blocked_reason: blockReason,
          is_vpn: data.vpn,
          is_proxy: data.proxy,
          is_tor: data.tor,
          fraud_score: data.fraud_score,
          country_code: data.country_code,
          is_permanent: false,
          block_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          detection_data: detectionData,
          metadata: {
            auto_blocked: true,
            detection_source: 'ipqualityscore',
            blocked_from: 'vpn_proxy_detection'
          }
        })

      console.log('IP blocked due to VPN/proxy detection:', ipAddress)
    } else if (cachedResult) {
      // Update existing record with new detection data
      await supabaseClient
        .from('blocked_ips')
        .update({
          is_vpn: data.vpn,
          is_proxy: data.proxy,
          is_tor: data.tor,
          fraud_score: data.fraud_score,
          country_code: data.country_code,
          detection_data: detectionData
        })
        .eq('ip_address', ipAddress)
    }

    return new Response(
      JSON.stringify({
        suspicious: isSuspicious,
        is_vpn: data.vpn,
        is_proxy: data.proxy,
        is_tor: data.tor,
        fraud_score: data.fraud_score,
        country_code: data.country_code,
        reason: isSuspicious ? `This IP shows indicators of ${data.vpn ? 'VPN' : ''}${data.proxy ? ' Proxy' : ''}${data.tor ? ' Tor' : ''}` : null,
        cached: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in detect-vpn-proxy function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        suspicious: false // Fail open for better UX
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})