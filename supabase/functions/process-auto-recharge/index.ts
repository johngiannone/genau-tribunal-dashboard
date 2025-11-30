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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();
    console.log('Processing auto-recharge for user:', user_id);

    // 1. Fetch user's billing settings
    const { data: billing, error: billingError } = await supabaseClient
      .from('organization_billing')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (billingError || !billing) {
      console.error('Failed to fetch billing:', billingError);
      return new Response(
        JSON.stringify({ error: 'Billing settings not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if auto-recharge is enabled and balance is below threshold
    if (!billing.auto_recharge_enabled) {
      console.log('Auto-recharge is disabled for user');
      return new Response(
        JSON.stringify({ message: 'Auto-recharge is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (billing.credit_balance >= billing.auto_recharge_threshold) {
      console.log('Balance above threshold, no recharge needed');
      return new Response(
        JSON.stringify({ message: 'Balance sufficient, no recharge needed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check if there's already a pending recharge
    const { data: pendingRecharge } = await supabaseClient
      .from('auto_recharge_attempts')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .single();

    if (pendingRecharge) {
      console.log('Pending recharge already exists');
      return new Response(
        JSON.stringify({ message: 'Auto-recharge already in progress' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Detect user region for Stripe routing
    // Try to get country from recent activity logs
    const { data: recentActivity } = await supabaseClient
      .from('activity_logs')
      .select('metadata')
      .eq('user_id', user_id)
      .not('metadata->country', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const userCountry = recentActivity?.metadata?.country || 'US';
    console.log(`User country for auto-recharge: ${userCountry}`);

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

    const rechargeAmount = billing.auto_recharge_amount;
    console.log(`Creating Stripe checkout for ${currency === 'gbp' ? '£' : currency === 'eur' ? '€' : '$'}${rechargeAmount}`);

    // Get user email for Stripe
    const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(user_id);
    
    if (userError || !user?.email) {
      console.error('Failed to fetch user email:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        'line_items[0][price_data][product_data][name]': 'Credit Top-Up (Auto-Recharge)',
        'line_items[0][price_data][unit_amount]': String(Math.round(rechargeAmount * 100)),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/settings/billing?recharge=success`,
        'cancel_url': `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/settings/billing?recharge=cancelled`,
        'client_reference_id': user_id,
        'customer_email': user.email,
        'metadata[user_id]': user_id,
        'metadata[amount]': String(rechargeAmount),
        'metadata[currency]': currency,
        'metadata[type]': 'auto_recharge',
        'metadata[country]': userCountry,
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', errorText);
      
      // Log failed attempt
      await supabaseClient.from('auto_recharge_attempts').insert({
        user_id,
        amount: rechargeAmount,
        status: 'failed',
        error_message: `Stripe API error: ${errorText}`,
      });

      return new Response(
        JSON.stringify({ error: 'Failed to create Stripe session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripeResponse.json();
    console.log('Stripe session created:', session.id);

    // 5. Log the recharge attempt
    const { error: insertError } = await supabaseClient
      .from('auto_recharge_attempts')
      .insert({
        user_id,
        amount: rechargeAmount,
        status: 'pending',
        stripe_session_id: session.id,
      });

    if (insertError) {
      console.error('Failed to log recharge attempt:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        amount: rechargeAmount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in process-auto-recharge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});