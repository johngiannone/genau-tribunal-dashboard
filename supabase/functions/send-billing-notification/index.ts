import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  type: "low_balance" | "purchase_success" | "auto_recharge_success";
  data: {
    amount?: number;
    currentBalance?: number;
    threshold?: number;
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, type, data }: NotificationRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      console.error("Failed to fetch user email:", userError);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.user.email;
    let subject = "";
    let html = "";

    // Build email content based on type
    if (type === "low_balance") {
      subject = "⚠️ Low Credit Balance Alert - Genau";
      html = `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1D1D1F; font-size: 24px; margin-bottom: 16px;">Low Credit Balance</h1>
          <p style="color: #86868B; font-size: 16px; line-height: 1.6;">
            Your Genau credit balance has fallen below your configured threshold.
          </p>
          <div style="background: #F5F5F7; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <p style="margin: 0; color: #1D1D1F;"><strong>Current Balance:</strong> $${data.currentBalance?.toFixed(2)}</p>
            <p style="margin: 8px 0 0 0; color: #1D1D1F;"><strong>Threshold:</strong> $${data.threshold?.toFixed(2)}</p>
          </div>
          <p style="color: #86868B; font-size: 16px; line-height: 1.6;">
            To continue running audits without interruption, please add credits to your account or enable auto-recharge.
          </p>
          <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/billing" 
             style="display: inline-block; background: #0071E3; color: white; padding: 12px 24px; 
                    border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
            Add Credits
          </a>
          <p style="color: #86868B; font-size: 14px; margin-top: 32px;">
            Best regards,<br>The Genau Team
          </p>
        </div>
      `;
    } else if (type === "purchase_success") {
      subject = "✅ Credit Purchase Successful - Genau";
      html = `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1D1D1F; font-size: 24px; margin-bottom: 16px;">Purchase Confirmed</h1>
          <p style="color: #86868B; font-size: 16px; line-height: 1.6;">
            Your credit purchase was successful! Your account has been credited.
          </p>
          <div style="background: #F5F5F7; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <p style="margin: 0; color: #1D1D1F;"><strong>Amount Added:</strong> $${data.amount?.toFixed(2)}</p>
            <p style="margin: 8px 0 0 0; color: #1D1D1F;"><strong>New Balance:</strong> $${data.currentBalance?.toFixed(2)}</p>
          </div>
          <p style="color: #86868B; font-size: 16px; line-height: 1.6;">
            You can now continue running audits with your AI Council.
          </p>
          <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/billing" 
             style="display: inline-block; background: #0071E3; color: white; padding: 12px 24px; 
                    border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
            View Billing
          </a>
          <p style="color: #86868B; font-size: 14px; margin-top: 32px;">
            Best regards,<br>The Genau Team
          </p>
        </div>
      `;
    } else if (type === "auto_recharge_success") {
      subject = "🔄 Auto-Recharge Successful - Genau";
      html = `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1D1D1F; font-size: 24px; margin-bottom: 16px;">Auto-Recharge Completed</h1>
          <p style="color: #86868B; font-size: 16px; line-height: 1.6;">
            Your account was automatically recharged to keep your audits running smoothly.
          </p>
          <div style="background: #F5F5F7; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <p style="margin: 0; color: #1D1D1F;"><strong>Amount Added:</strong> $${data.amount?.toFixed(2)}</p>
            <p style="margin: 8px 0 0 0; color: #1D1D1F;"><strong>New Balance:</strong> $${data.currentBalance?.toFixed(2)}</p>
          </div>
          <p style="color: #86868B; font-size: 16px; line-height: 1.6;">
            Your auto-recharge settings ensure you never run out of credits. You can adjust these settings anytime.
          </p>
          <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/billing" 
             style="display: inline-block; background: #0071E3; color: white; padding: 12px 24px; 
                    border-radius: 8px; text-decoration: none; margin-top: 16px; font-weight: 600;">
            Manage Settings
          </a>
          <p style="color: #86868B; font-size: 14px; margin-top: 32px;">
            Best regards,<br>The Genau Team
          </p>
        </div>
      `;
    }

    // Send email via Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Genau <notifications@genau.io>",
      to: [userEmail],
      subject,
      html,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      return new Response(JSON.stringify({ error: "Email sending failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Email sent successfully to ${userEmail}:`, emailData);

    return new Response(JSON.stringify({ success: true, messageId: emailData?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-billing-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
