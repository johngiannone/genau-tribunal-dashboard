import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusChangeEmailRequest {
  userId: string;
  userEmail: string;
  newStatus: 'active' | 'inactive' | 'disabled';
  previousStatus: 'active' | 'inactive' | 'disabled';
  reason?: string;
  customMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, userEmail, newStatus, previousStatus, reason, customMessage }: StatusChangeEmailRequest = await req.json();

    console.log("Sending account status change email:", { userId, userEmail, newStatus, previousStatus });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get admin info who made the change
    const authHeader = req.headers.get("Authorization");
    let adminEmail = "System";
    let sentById = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) {
        adminEmail = user.email || "Admin";
        sentById = user.id;
      }
    }

    // Define status colors and titles
    const statusConfig = {
      active: { color: "#10B981", title: "Account Activated", action: "activated" },
      inactive: { color: "#F59E0B", title: "Account Set to Inactive", action: "marked as inactive" },
      disabled: { color: "#EF4444", title: "Account Disabled", action: "disabled" },
    };

    const config = statusConfig[newStatus];

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${config.title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); padding: 40px 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        ${config.title}
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #111111; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hello,
                      </p>
                      
                      <p style="color: #111111; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Your Consensus account has been <strong>${config.action}</strong> by an administrator.
                      </p>
                      
                      ${reason ? `
                        <div style="background-color: #f9fafb; border-left: 4px solid ${config.color}; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
                          <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 8px;">Reason:</p>
                          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
                            ${reason}
                          </p>
                        </div>
                      ` : ''}
                      
                      ${customMessage ? `
                        <div style="background-color: #f0f9ff; border-left: 4px solid #0071E3; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
                          <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 8px;">Additional Information:</p>
                          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">
                            ${customMessage}
                          </p>
                        </div>
                      ` : ''}
                      
                      <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin: 24px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #86868B; font-size: 14px;">Status Changed:</span>
                            </td>
                            <td align="right" style="padding: 8px 0;">
                              <span style="color: #111111; font-size: 14px; font-weight: 600;">
                                ${previousStatus} → ${newStatus}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; border-top: 1px solid #e5e5ea;">
                              <span style="color: #86868B; font-size: 14px;">Changed By:</span>
                            </td>
                            <td align="right" style="padding: 8px 0; border-top: 1px solid #e5e5ea;">
                              <span style="color: #111111; font-size: 14px; font-weight: 600;">
                                ${adminEmail}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; border-top: 1px solid #e5e5ea;">
                              <span style="color: #86868B; font-size: 14px;">Date:</span>
                            </td>
                            <td align="right" style="padding: 8px 0; border-top: 1px solid #e5e5ea;">
                              <span style="color: #111111; font-size: 14px; font-weight: 600;">
                                ${new Date().toLocaleString('en-US', { 
                                  dateStyle: 'medium', 
                                  timeStyle: 'short' 
                                })}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      ${newStatus === 'active' ? `
                        <p style="color: #111111; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                          You can now access your account and continue using Consensus.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${Deno.env.get('SUPABASE_URL')?.replace('//', '//').split('.')[0].replace('https://', '')}://app" 
                             style="display: inline-block; background-color: #0071E3; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 24px; font-weight: 600; font-size: 16px;">
                            Go to Dashboard
                          </a>
                        </div>
                      ` : `
                        <p style="color: #111111; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                          If you have questions or believe this was done in error, please contact our support team.
                        </p>
                      `}
                      
                      <p style="color: #86868B; font-size: 14px; line-height: 1.5; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e5e5ea;">
                        Questions? Contact us at <a href="mailto:support@consensus.ai" style="color: #0071E3; text-decoration: none;">support@consensus.ai</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center;">
                      <p style="color: #86868B; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Consensus AI. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "Consensus <onboarding@resend.dev>",
      to: [userEmail],
      subject: `${config.title} - Consensus`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email to email_logs table
    const { error: logError } = await supabaseClient
      .from('email_logs')
      .insert({
        user_id: userId,
        email_type: 'status_change',
        recipient_email: userEmail,
        subject: `${config.title} - Consensus`,
        status: 'sent',
        metadata: {
          new_status: newStatus,
          previous_status: previousStatus,
          reason: reason || null,
          custom_message: customMessage || null,
        },
        sent_by: sentById,
        message_id: emailResponse.data?.id || null,
      });

    if (logError) {
      console.error("Error logging email to database:", logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-account-status-email function:", error);

    // Try to log the failed email attempt
    try {
      const requestBody = await req.clone().json();
      const { userId, userEmail, newStatus, previousStatus } = requestBody;
      
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const authHeaderForError = req.headers.get("Authorization");
      let errorSentById = null;
      
      if (authHeaderForError) {
        const token = authHeaderForError.replace("Bearer ", "");
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        errorSentById = user?.id || null;
      }

      await supabaseClient
        .from('email_logs')
        .insert({
          user_id: userId,
          email_type: 'status_change',
          recipient_email: userEmail,
          subject: `Account Status Change - Consensus`,
          status: 'failed',
          metadata: {
            new_status: newStatus,
            previous_status: previousStatus,
          },
          sent_by: errorSentById,
          error_message: error.message,
        });
    } catch (logError) {
      console.error("Error logging failed email:", logError);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);