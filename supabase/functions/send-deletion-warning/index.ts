import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Resend } from "npm:resend@4.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { DeletionWarningEmail } from "./_templates/deletion-warning.tsx";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting deletion warning check...');

    // Fetch all users with retention policies
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, data_retention_days')
      .not('data_retention_days', 'is', null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`Found ${profiles?.length || 0} users with retention policies`);

    let emailsSent = 0;

    // Process each user
    for (const profile of profiles || []) {
      const retentionDays = profile.data_retention_days;
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() - (retentionDays - 7)); // Data that's 7 days from deletion
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 7);

      // Check if data exists that will be deleted in 7 days
      const dataTypes: string[] = [];

      // Check conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', profile.id)
        .lt('created_at', warningDate.toISOString())
        .limit(1);

      if (conversations && conversations.length > 0) {
        dataTypes.push('Conversations and messages');
      }

      // Check audit history
      const { data: audits } = await supabase
        .from('training_dataset')
        .select('id')
        .eq('user_id', profile.id)
        .lt('created_at', warningDate.toISOString())
        .limit(1);

      if (audits && audits.length > 0) {
        dataTypes.push('Audit history');
      }

      // Check activity logs
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', profile.id)
        .lt('created_at', warningDate.toISOString())
        .limit(1);

      if (activities && activities.length > 0) {
        dataTypes.push('Activity logs');
      }

      // If there's data to be deleted, check if we've already sent a warning
      if (dataTypes.length > 0) {
        const scheduledDeletionDate = deletionDate.toISOString().split('T')[0];

        // Check if we've already sent this warning
        const { data: existingWarning } = await supabase
          .from('deletion_warnings')
          .select('id')
          .eq('user_id', profile.id)
          .eq('scheduled_deletion_date', scheduledDeletionDate)
          .single();

        if (!existingWarning) {
          console.log(`Sending warning email to ${profile.email}`);

          // Render email template
          const html = await renderAsync(
            React.createElement(DeletionWarningEmail, {
              userName: profile.email?.split('@')[0] || 'there',
              retentionDays,
              deletionDate: deletionDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              dataTypes,
              settingsUrl: `${supabaseUrl.replace('acqvzijmmabapbmefdzi.supabase.co', 'app.genau.io')}/settings`,
            })
          );

          // Send email via Resend
          const { data, error } = await resend.emails.send({
            from: 'Genau AI <notifications@genau.io>',
            to: [profile.email!],
            subject: '⚠️ Your Genau data will be deleted in 7 days',
            html,
          });

          if (error) {
            console.error(`Failed to send email to ${profile.email}:`, error);
            throw new Error(`Resend API error: ${JSON.stringify(error)}`);
          }

          console.log(`Email sent successfully to ${profile.email}:`, data);

          // Record that we sent this warning
          for (const dataType of ['audit_history', 'conversations', 'activity_logs']) {
            await supabase
              .from('deletion_warnings')
              .insert({
                user_id: profile.id,
                data_type: dataType,
                scheduled_deletion_date: scheduledDeletionDate,
              });
          }

          emailsSent++;
        } else {
          console.log(`Warning already sent to ${profile.email} for ${scheduledDeletionDate}`);
        }
      }
    }

    const result = {
      success: true,
      emails_sent: emailsSent,
      timestamp: new Date().toISOString(),
    };

    console.log('Deletion warning check complete:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Deletion warning error:', error);
    return new Response(
      JSON.stringify({ error: `Warning check failed: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
