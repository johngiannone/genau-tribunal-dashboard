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
      
      // Also return stored country if available
      const userCountryCookie = cookies.split(';').find(c => c.trim().startsWith('user_country='));
      const storedCountry = userCountryCookie ? userCountryCookie.split('=')[1] : null;
      
      return new Response(
        JSON.stringify({ 
          redirect: null, 
          locale: userLocale,
          country: storedCountry,
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
    } else if (countryCode === 'FR') {
      locale = 'fr';
    } else if (countryCode === 'IT') {
      locale = 'it';
    } else if (countryCode === 'ES') {
      locale = 'es';
    }

    // Determine redirect path
    const { currentPath } = await req.json().catch(() => ({ currentPath: '/' }));
    
    // Check if path already has language prefix
    const pathSegments = currentPath.split('/').filter(Boolean);
    const hasLangPrefix = ['en', 'en-gb', 'de', 'fr', 'it', 'es'].includes(pathSegments[0]);
    
    if (hasLangPrefix && pathSegments[0] === locale) {
      // Already on correct locale path - set country cookie and return
      const responseHeaders = {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Set-Cookie': `user_country=${countryCode}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
      };
      
      return new Response(
        JSON.stringify({ 
          redirect: null, 
          locale,
          country: countryCode,
          reason: 'already_correct' 
        }),
        { headers: responseHeaders, status: 200 }
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

    // Set country cookie for Stripe routing
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Set-Cookie': `user_country=${countryCode}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
    };

    return new Response(
      JSON.stringify({ 
        redirect: redirectPath, 
        locale,
        country: countryCode,
        reason: 'geo_routing' 
      }),
      { headers: responseHeaders, status: 200 }
    );
  } catch (error) {
    console.error('Error in geo-route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process geo-routing' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
