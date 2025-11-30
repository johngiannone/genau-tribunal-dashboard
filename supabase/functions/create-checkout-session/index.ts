import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, country } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect user's country for region-specific Stripe routing
    const userCountry = country || req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country') || 'US';
    console.log(`User country detected: ${userCountry}`);

    // Determine Stripe account and currency based on region
    let stripeKey: string;
    let currency: string;
    
    if (userCountry === 'GB') {
      // UK uses GBP
      stripeKey = Deno.env.get('STRIPE_SECRET_KEY_UK') || Deno.env.get('STRIPE_SECRET_KEY') || '';
      currency = 'gbp';
      console.log('Using UK Stripe account with GBP currency');
    } else if (['DE', 'FR', 'IT', 'ES', 'AT', 'BE', 'NL', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'GR', 'CH', 'PL', 'CZ', 'RO', 'HU'].includes(userCountry)) {
      // EU countries use EUR
      stripeKey = Deno.env.get('STRIPE_SECRET_KEY_UK') || Deno.env.get('STRIPE_SECRET_KEY') || '';
      currency = 'eur';
      console.log('Using UK/EU Stripe account with EUR currency');
    } else {
      // Rest of world uses USD
      stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
      currency = 'usd';
      console.log('Using US Stripe account with USD currency');
    }

    console.log(`Creating checkout session for user ${user.id}, amount: ${amount} ${currency.toUpperCase()}`);
    
    // Get current origin for redirect URLs
    const origin = req.headers.get('origin') || Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';

    // Create Stripe Checkout Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][product_data][name]': `Genau Credits - ${currency === 'gbp' ? '£' : currency === 'eur' ? '€' : '$'}${amount}`,
        'line_items[0][price_data][product_data][description]': 'AI Consensus Engine Credits',
        'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${origin}/settings/billing?purchase=success&amount=${amount}&currency=${currency}`,
        'cancel_url': `${origin}/settings/billing?purchase=cancelled`,
        'client_reference_id': user.id,
        'customer_email': user.email || '',
        'metadata[user_id]': user.id,
        'metadata[amount]': String(amount),
        'metadata[currency]': currency,
        'metadata[type]': 'manual_purchase',
        'metadata[country]': userCountry,
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripeResponse.json();
    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        url: session.url 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-checkout-session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});