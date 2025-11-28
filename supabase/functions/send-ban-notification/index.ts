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
    const { userId, banReason, violationCount, violationCategories } = await req.json()
    
    console.log("Sending ban notification to user:", userId)

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
    const violationsList = violationCategories 
      ? violationCategories.split(', ').map((cat: string) => `<li>${cat}</li>`).join('')
      : '<li>Content policy violations</li>'

    // Send ban notification email
    const emailResponse = await resend.emails.send({
      from: "Consensus AI Security <onboarding@resend.dev>",
      to: [userEmail],
      subject: "🚫 Account Suspended - Policy Violation",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Account Suspended</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px;">
              Your Consensus AI account has been automatically suspended due to repeated content policy violations.
            </p>
            
            <div style="background: white; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b;">Suspension Details:</p>
              <p style="margin: 0; font-size: 14px; color: #374151;">
                <strong>Violations detected:</strong> ${violationCount}<br>
                <strong>Time period:</strong> Within 24 hours<br>
                <strong>Reason:</strong> ${banReason || 'Multiple content policy violations'}
              </p>
            </div>
            
            <div style="margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">Flagged Content Categories:</p>
              <ul style="margin: 0; padding-left: 20px; color: #374151;">
                ${violationsList}
              </ul>
            </div>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #991b1b;">
                ⚠️ What This Means:
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 14px;">
                <li>You can no longer access the Consensus AI platform</li>
                <li>All active sessions have been terminated</li>
                <li>Your audit history has been preserved for review</li>
              </ul>
            </div>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 12px 0; font-weight: 600; color: #111827;">
                📧 How to Appeal:
              </p>
              <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                If you believe this suspension was made in error, you may submit an appeal by emailing:
              </p>
              <p style="margin: 12px 0; font-size: 16px;">
                <a href="mailto:appeals@consensusai.support" style="color: #0071E3; text-decoration: none; font-weight: 600;">
                  appeals@consensusai.support
                </a>
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Include your account email and a brief explanation. Appeals are typically reviewed within 2-3 business days.
              </p>
            </div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                This action was taken automatically by our content moderation system to maintain platform integrity and comply with our Terms of Service. 
                Repeated violations of our content policy may result in permanent account termination.
              </p>
            </div>
          </div>
        </div>
      `,
    })

    console.log("Ban notification sent successfully:", emailResponse)

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error: any) {
    console.error("Error in send-ban-notification function:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    )
  }
})