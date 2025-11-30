import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BugReportRequest {
  subject: string;
  description: string;
  screenshotUrl?: string;
  userEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, description, screenshotUrl, userEmail }: BugReportRequest = await req.json();

    console.log("Processing bug report:", { subject, userEmail, hasScreenshot: !!screenshotUrl });

    // Build email HTML
    let emailHtml = `
      <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🐛 Bug Report</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <div style="margin-bottom: 24px;">
            <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">Subject</p>
            <p style="color: #111827; margin: 0; font-size: 18px; font-weight: 600;">${subject}</p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">Description</p>
            <p style="color: #374151; margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${description}</p>
          </div>
          
          <div style="margin-bottom: 24px;">
            <p style="color: #6b7280; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">Reported By</p>
            <p style="color: #374151; margin: 0; font-size: 15px;">${userEmail}</p>
          </div>
    `;

    if (screenshotUrl) {
      emailHtml += `
          <div style="margin-bottom: 24px;">
            <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; font-weight: 600;">Screenshot</p>
            <a href="${screenshotUrl}" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
              View Screenshot
            </a>
          </div>
      `;
    }

    emailHtml += `
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
              Reported at: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Genau Support <support@genau.io>",
        to: ["support@genau.io"],
        reply_to: userEmail,
        subject: `🐛 Bug Report: ${subject}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();

    console.log("Bug report email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, messageId: emailData.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending bug report:", error);
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
