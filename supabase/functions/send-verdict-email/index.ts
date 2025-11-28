import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerdictEmailRequest {
  recipientEmail: string;
  recipientName?: string;
  customMessage?: string;
  userPrompt: string;
  verdict: string;
  confidence: number;
  senderName?: string;
  pdfBase64?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recipientName,
      customMessage,
      userPrompt,
      verdict,
      confidence,
      senderName,
      pdfBase64,
    }: SendVerdictEmailRequest = await req.json();

    console.log("Sending verdict email to:", recipientEmail);

    const attachments = pdfBase64 ? [{
      filename: `consensus-report-${Date.now()}.pdf`,
      content: pdfBase64,
    }] : [];

    const emailResponse = await resend.emails.send({
      from: "Consensus Engine <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `${senderName || "Someone"} shared a Consensus Report with you`,
      attachments,
      html: `
        <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">The Council's Verdict</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Consensus Report Shared</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5ea; border-top: none; border-radius: 0 0 12px 12px;">
            ${customMessage ? `
              <div style="background: #f5f5f7; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #06b6d4;">
                <p style="margin: 0; color: #1d1d1f; font-size: 14px; line-height: 1.6;"><strong>${senderName || "A user"}</strong> says:</p>
                <p style="margin: 8px 0 0 0; color: #1d1d1f; font-size: 14px; line-height: 1.6;">${customMessage}</p>
              </div>
            ` : ''}
            
            <h2 style="color: #1d1d1f; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">Original Query</h2>
            <p style="color: #1d1d1f; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; padding: 12px; background: #f5f5f7; border-radius: 8px;">${userPrompt}</p>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <h2 style="color: #1d1d1f; font-size: 18px; font-weight: 700; margin: 0;">Consensus Analysis</h2>
              <div style="background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 16px;">
                ${confidence}% Confidence
              </div>
            </div>
            
            <div style="color: #1d1d1f; font-size: 14px; line-height: 1.7; padding: 20px; background: linear-gradient(to bottom right, #fef3c7, #fde68a); border: 2px solid #fbbf24; border-radius: 12px;">
              ${verdict.substring(0, 500)}${verdict.length > 500 ? '...' : ''}
            </div>
            
            ${pdfBase64 ? `
              <p style="margin: 24px 0 0 0; color: #86868b; font-size: 13px;">
                📎 Full report attached as PDF
              </p>
            ` : ''}
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5ea;">
              <p style="color: #86868b; font-size: 12px; margin: 0; text-align: center;">
                Powered by <strong>Consensus Engine</strong> – Multi-model AI analysis
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-verdict-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
