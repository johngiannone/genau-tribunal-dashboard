import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    console.error('Missing signature or webhook secret');
    return new Response('Webhook signature or secret missing', { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log('Webhook event received:', event.type);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('Processing checkout session:', session.id);
      console.log('Customer reference:', session.client_reference_id);
      console.log('Metadata:', session.metadata);

      const userId = session.client_reference_id || session.metadata?.user_id;
      const amount = parseFloat(session.metadata?.amount || '0');
      const rechargeType = session.metadata?.type || 'manual';

      if (!userId || !amount) {
        console.error('Missing user_id or amount in session metadata');
        return new Response('Invalid session metadata', { status: 400 });
      }

      // 1. Fetch current billing info
      const { data: billing, error: billingError } = await supabaseClient
        .from('organization_billing')
        .select('credit_balance')
        .eq('user_id', userId)
        .single();

      if (billingError || !billing) {
        console.error('Failed to fetch billing:', billingError);
        return new Response('Billing not found', { status: 404 });
      }

      const newBalance = billing.credit_balance + amount;

      // 2. Add credits to user's balance
      const { error: updateError } = await supabaseClient
        .from('organization_billing')
        .update({ 
          credit_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update balance:', updateError);
        return new Response('Failed to update balance', { status: 500 });
      }

      console.log(`Credits added: $${amount}, New balance: $${newBalance}`);

      // 3. Log billing transaction
      const { error: transactionError } = await supabaseClient
        .from('billing_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          transaction_type: rechargeType === 'auto_recharge' ? 'auto_recharge' : 'credit_added',
          description: rechargeType === 'auto_recharge' 
            ? `Auto-recharge: $${amount.toFixed(2)}` 
            : `Manual credit purchase: $${amount.toFixed(2)}`,
          balance_after: newBalance,
          metadata: {
            stripe_session_id: session.id,
            payment_intent: session.payment_intent,
            recharge_type: rechargeType
          }
        });

      if (transactionError) {
        console.error('Failed to log transaction:', transactionError);
      }

      // 4. Update auto_recharge_attempts if this was an auto-recharge
      if (rechargeType === 'auto_recharge') {
        const { error: attemptError } = await supabaseClient
          .from('auto_recharge_attempts')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('stripe_session_id', session.id)
          .eq('status', 'pending');

        if (attemptError) {
          console.error('Failed to update recharge attempt:', attemptError);
        }
      }

      // 5. Send email notification
      const emailType = rechargeType === 'auto_recharge' ? 'auto_recharge_success' : 'purchase_success';
      console.log(`Sending ${emailType} email notification...`);
      
      supabaseClient.functions.invoke('send-billing-notification', {
        body: {
          userId,
          type: emailType,
          data: {
            amount,
            currentBalance: newBalance
          }
        }
      }).catch(err => {
        console.error('Email notification failed:', err);
      });

      // 6. Log activity
      await supabaseClient.from('activity_logs').insert({
        user_id: userId,
        activity_type: 'profile_update',
        description: rechargeType === 'auto_recharge'
          ? `Auto-recharge completed: $${amount.toFixed(2)}`
          : `Credits added: $${amount.toFixed(2)}`,
        metadata: {
          amount,
          new_balance: newBalance,
          stripe_session_id: session.id,
          recharge_type: rechargeType
        }
      });

      console.log('Payment processed successfully');
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle payment_intent.succeeded as fallback
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment intent succeeded:', paymentIntent.id);
      
      // This is handled primarily via checkout.session.completed
      // but we log it for completeness
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // For other event types, just acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});