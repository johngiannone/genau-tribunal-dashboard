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
    // Check if user has manually set their locale preference
    const cookies = req.headers.get('cookie') || '';
    const userLocaleCookie = cookies.split(';').find(c => c.trim().startsWith('user_locale='));
    
    if (userLocaleCookie) {
      const userLocale = userLocaleCookie.split('=')[1];
      console.log(`User has manual locale preference: ${userLocale}`);
      return new Response(
        JSON.stringify({ 
          redirect: null, 
          locale: userLocale,
          reason: 'user_preference' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get country from Cloudflare header
    const countryCode = req.headers.get('cf-ipcountry') || 
                        req.headers.get('x-vercel-ip-country') || 
                        'US';
    
    console.log(`Detected country: ${countryCode}`);

    // Map country codes to locales
    let locale = 'en'; // default
    
    if (countryCode === 'DE') {
      locale = 'de';
    } else if (countryCode === 'GB') {
      locale = 'en-gb';
    }

    // Determine redirect path
    const { currentPath } = await req.json().catch(() => ({ currentPath: '/' }));
    
    // Check if path already has language prefix
    const pathSegments = currentPath.split('/').filter(Boolean);
    const hasLangPrefix = ['en', 'en-gb', 'de'].includes(pathSegments[0]);
    
    if (hasLangPrefix && pathSegments[0] === locale) {
      // Already on correct locale path
      return new Response(
        JSON.stringify({ 
          redirect: null, 
          locale,
          reason: 'already_correct' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Build redirect path
    let redirectPath = `/${locale}`;
    if (hasLangPrefix) {
      pathSegments.shift(); // Remove old language prefix
    }
    if (pathSegments.length > 0) {
      redirectPath += `/${pathSegments.join('/')}`;
    }

    return new Response(
      JSON.stringify({ 
        redirect: redirectPath, 
        locale,
        countryCode,
        reason: 'geo_routing' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in geo-route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process geo-routing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
