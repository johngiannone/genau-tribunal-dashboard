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
    const alertTypeLabel = alertType === 'daily_threshold' ? 'Daily' : 'Per-Audit'
    const costFormatted = `$${estimatedCost.toFixed(4)}`
    const thresholdFormatted = `$${threshold.toFixed(4)}`

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Consensus AI <onboarding@resend.dev>",
      to: [userEmail],
      subject: `⚠️ Cost Alert: ${alertTypeLabel} Threshold Exceeded`,
      html: `
        <h1>Cost Threshold Exceeded</h1>
        <p>Your ${alertTypeLabel.toLowerCase()} cost threshold has been exceeded.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            <strong>Threshold:</strong> ${thresholdFormatted}<br>
            <strong>Current Cost:</strong> ${costFormatted}
          </p>
        </div>
        
        <p>To avoid unexpected charges, consider:</p>
        <ul>
          <li>Reviewing your model selections for cost efficiency</li>
          <li>Adjusting your cost thresholds in the admin panel</li>
          <li>Monitoring your daily usage more closely</li>
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