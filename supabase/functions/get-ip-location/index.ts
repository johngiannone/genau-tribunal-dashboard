import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip } = await req.json();

    if (!ip) {
      return new Response(
        JSON.stringify({ error: 'IP address required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use ip-api.com free geolocation service
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon`);
    const data = await response.json();

    if (data.status === 'fail') {
      return new Response(
        JSON.stringify({ city: 'Unknown', country: 'Unknown', countryCode: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        countryCode: data.countryCode || null,
        lat: data.lat,
        lon: data.lon,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error fetching IP location:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch location data' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
