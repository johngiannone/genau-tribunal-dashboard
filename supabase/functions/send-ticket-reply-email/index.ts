import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyEmailRequest {
  ticketId: string;
  commentId: string;
  comment: string;
  isAdminReply: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, commentId, comment, isAdminReply }: ReplyEmailRequest = await req.json();

    console.log(`Processing reply email for ticket ${ticketId}, comment ${commentId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("email, subject, id, user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error("Error fetching ticket:", ticketError);
      throw new Error("Ticket not found");
    }

    // Only send email notification to users when admin replies
    // (Don't notify admins when users reply - they'll see it in the panel)
    if (!isAdminReply) {
      console.log("User reply - no notification sent");
      return new Response(
        JSON.stringify({ message: "No notification sent for user reply" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email notification via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Genau Support <support@genau.io>",
        to: [ticket.email],
        subject: `New reply to your ticket - #${ticket.id.split('-')[0].toUpperCase()}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0071E3 0%, #0055B8 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Genau Support</h1>
            </div>
            
            <div style="padding: 40px 30px; background: #fff;">
              <h2 style="color: #111; margin-top: 0; font-size: 20px;">New Reply from Support Team</h2>
              
              <div style="background: #F5F5F7; border-left: 4px solid #0071E3; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;"><strong>Ticket ID:</strong> #${ticket.id.split('-')[0].toUpperCase()}</p>
                <p style="margin: 0; color: #666; font-size: 14px;"><strong>Subject:</strong> ${ticket.subject}</p>
              </div>
              
              <div style="background: #fff; border: 1px solid #E5E5EA; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #0071E3; font-size: 12px; font-weight: 600; text-transform: uppercase;">Support Team Reply:</p>
                <p style="color: #333; line-height: 1.6; font-size: 15px; margin: 0; white-space: pre-wrap;">${comment}</p>
              </div>
              
              <p style="color: #666; line-height: 1.6; font-size: 14px;">
                You can view the full conversation and reply to this ticket by clicking the button below.
              </p>
              
              <div style="margin: 30px 0;">
                <a href="https://app.genau.io/tickets" 
                   style="background: #0071E3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                  View & Reply
                </a>
              </div>
            </div>
            
            <div style="padding: 20px 30px; background: #F5F5F7; border-top: 1px solid #E5E5EA; text-align: center;">
              <p style="color: #86868B; font-size: 12px; margin: 0;">
                This is an automated notification from Genau AI Auditor.<br>
                Please do not reply directly to this email. Use the ticket system to respond.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailData = await emailResponse.json();
    console.log("Reply email sent successfully:", emailData);

    // Log the email to email_logs table
    await supabase.from("email_logs").insert({
      user_id: ticket.user_id || null,
      email_type: "ticket_reply",
      recipient_email: ticket.email,
      subject: `New reply to your ticket - #${ticket.id.split('-')[0].toUpperCase()}`,
      status: "sent",
      metadata: {
        ticket_id: ticketId,
        comment_id: commentId,
        resend_id: emailData.id
      }
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending ticket reply email:", error);
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
