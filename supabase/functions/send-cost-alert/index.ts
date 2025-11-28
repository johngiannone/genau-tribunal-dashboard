import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from "https://esm.sh/resend@4.0.0"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const resend = new Resend(RESEND_API_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, alertType, estimatedCost, threshold } = await req.json()
    
    console.log("Sending cost alert:", { userId, alertType, estimatedCost, threshold })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user email from auth.users
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !user?.email) {
      console.error("Failed to get user email:", userError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const userEmail = user.email
    const alertTypeLabel = alertType === 'daily_threshold' ? 'Daily' : 
                          alertType === 'budget_forecast' ? 'Budget Forecast' : 
                          'Per-Audit'
    const costFormatted = `$${estimatedCost.toFixed(4)}`
    const thresholdFormatted = `$${threshold.toFixed(4)}`
    
    const isForecasted = alertType === 'budget_forecast'

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Consensus AI <onboarding@resend.dev>",
      to: [userEmail],
      subject: `${isForecasted ? '📊' : '⚠️'} Cost Alert: ${alertTypeLabel} ${isForecasted ? 'Warning' : 'Exceeded'}`,
      html: `
        <h1>${isForecasted ? 'Budget Forecast Warning' : 'Cost Threshold Exceeded'}</h1>
        <p>${isForecasted 
          ? 'Based on your current spending patterns, you are projected to exceed your monthly budget limit.'
          : `Your ${alertTypeLabel.toLowerCase()} cost threshold has been exceeded.`
        }</p>
        
        <div style="background: ${isForecasted ? '#fef9e7' : '#fef2f2'}; border-left: 4px solid ${isForecasted ? '#f59e0b' : '#dc2626'}; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: ${isForecasted ? '#92400e' : '#991b1b'};">
            <strong>${isForecasted ? 'Budget Limit' : 'Threshold'}:</strong> ${thresholdFormatted}<br>
            <strong>${isForecasted ? 'Projected Total' : 'Current Cost'}:</strong> ${costFormatted}
          </p>
        </div>
        
        <p>To avoid unexpected charges, consider:</p>
        <ul>
          <li>Reviewing your model selections for cost efficiency</li>
          <li>Adjusting your ${isForecasted ? 'budget limits' : 'cost thresholds'} in the admin panel</li>
          <li>Monitoring your daily usage more closely</li>
          ${isForecasted ? '<li>Reducing the frequency of audits for the remainder of the month</li>' : ''}
        </ul>
        
        <p style="margin-top: 20px; color: #666; font-size: 12px;">
          This is an automated alert from your Consensus AI system.
        </p>
      `,
    })

    console.log("Email sent successfully:", emailResponse)

    // Update alert record with email status
    const { error: updateError } = await supabase
      .from('cost_alerts')
      .update({
        notified_via_email: true,
        email_sent_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('alert_type', alertType)
      .is('email_sent_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (updateError) {
      console.error("Failed to update alert status:", updateError)
    }

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error: any) {
    console.error("Error in send-cost-alert function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    )
  }
})