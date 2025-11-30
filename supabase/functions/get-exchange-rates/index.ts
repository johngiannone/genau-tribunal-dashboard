import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have cached rates (less than 1 hour old)
    const { data: cachedRates } = await supabase
      .from('system_settings')
      .select('value, updated_at')
      .eq('key', 'exchange_rates')
      .single();

    if (cachedRates) {
      const cacheAge = Date.now() - new Date(cachedRates.updated_at).getTime();
      const oneHour = 60 * 60 * 1000;

      // Return cached rates if less than 1 hour old
      if (cacheAge < oneHour) {
        console.log('Returning cached exchange rates');
        return new Response(
          JSON.stringify({ 
            rates: cachedRates.value,
            cached: true,
            lastUpdated: cachedRates.updated_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Fetch fresh rates from frankfurter.app (free, no API key required)
    console.log('Fetching fresh exchange rates from frankfurter.app');
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();
    
    const rates = {
      USD: 1,
      EUR: data.rates.EUR,
      GBP: data.rates.GBP,
      lastUpdated: data.date,
    };

    console.log('Fetched rates:', rates);

    // Cache the rates in database
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert({
        key: 'exchange_rates',
        value: rates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key'
      });

    if (upsertError) {
      console.error('Failed to cache exchange rates:', upsertError);
    }

    return new Response(
      JSON.stringify({ 
        rates,
        cached: false,
        lastUpdated: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in get-exchange-rates:', error);
    
    // Fallback to hardcoded rates if API fails
    const fallbackRates = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      lastUpdated: new Date().toISOString(),
    };

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({ 
        rates: fallbackRates,
        cached: false,
        fallback: true,
        error: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
