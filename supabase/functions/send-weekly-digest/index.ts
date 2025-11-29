import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22';
import React from 'https://esm.sh/react@18.3.1';
import { PerformanceDigestEmail } from './_templates/performance-digest.tsx';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://genau.lovable.app';

const MIN_AUDITS_PER_TYPE = 5; // Minimum audits needed of each type to send digest

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== Weekly Digest Job Started ===");

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(RESEND_API_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate date range (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekStart = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Fetch all training data from the last week
    const { data: weeklyData, error: dataError } = await supabase
      .from('training_dataset')
      .select('user_id, council_source, human_rating')
      .gte('created_at', weekAgo.toISOString())
      .not('council_source', 'is', null)
      .not('human_rating', 'is', null);

    if (dataError) {
      console.error('Error fetching weekly data:', dataError);
      throw dataError;
    }

    console.log(`Found ${weeklyData?.length || 0} rated audits from last week`);

    if (!weeklyData || weeklyData.length === 0) {
      console.log('No data for this week, skipping digest');
      return new Response(
        JSON.stringify({ message: 'No data to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by user and calculate metrics
    const userMetrics = weeklyData.reduce((acc, item) => {
      if (!acc[item.user_id]) {
        acc[item.user_id] = {
          recommended: { total: 0, sum: 0, good: 0, bad: 0 },
          user_configured: { total: 0, sum: 0, good: 0, bad: 0 },
        };
      }

      const source = item.council_source === 'recommended' ? 'recommended' : 'user_configured';
      acc[item.user_id][source].total += 1;
      acc[item.user_id][source].sum += item.human_rating;
      if (item.human_rating === 1) acc[item.user_id][source].good += 1;
      if (item.human_rating === -1) acc[item.user_id][source].bad += 1;

      return acc;
    }, {} as Record<string, any>);

    console.log(`Processing digests for ${Object.keys(userMetrics).length} users`);

    // Filter users who have sufficient data for both types
    const eligibleUsers = Object.entries(userMetrics).filter(([userId, metrics]) => {
      return metrics.recommended.total >= MIN_AUDITS_PER_TYPE && 
             metrics.user_configured.total >= MIN_AUDITS_PER_TYPE;
    });

    console.log(`${eligibleUsers.length} users eligible for digest`);

    let emailsSent = 0;
    let emailsFailed = 0;

    // Send digest to each eligible user
    for (const [userId, metrics] of eligibleUsers) {
      try {
        // Fetch user email from auth
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError || !userData?.user?.email) {
          console.error(`Could not fetch email for user ${userId}:`, userError);
          emailsFailed++;
          continue;
        }

        const userEmail = userData.user.email;
        const userName = userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || 'there';

        // Calculate metrics
        const recommendedAvg = metrics.recommended.sum / metrics.recommended.total;
        const userConfiguredAvg = metrics.user_configured.sum / metrics.user_configured.total;
        const difference = recommendedAvg - userConfiguredAvg;
        const improvementPercentage = userConfiguredAvg !== 0 
          ? Math.abs((difference / userConfiguredAvg) * 100).toFixed(0)
          : '0';

        const totalAudits = metrics.recommended.total + metrics.user_configured.total;

        // Render email HTML
        const html = await renderAsync(
          React.createElement(PerformanceDigestEmail, {
            userName,
            weekStart,
            weekEnd,
            recommended: {
              avgRating: Number(recommendedAvg.toFixed(2)),
              count: metrics.recommended.total,
              goodCount: metrics.recommended.good,
              badCount: metrics.recommended.bad,
            },
            userConfigured: {
              avgRating: Number(userConfiguredAvg.toFixed(2)),
              count: metrics.user_configured.total,
              goodCount: metrics.user_configured.good,
              badCount: metrics.user_configured.bad,
            },
            totalAudits,
            improvementPercentage,
            appUrl: APP_URL,
          })
        );

        // Send email
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Consensus Engine <digest@genau.io>',
          to: [userEmail],
          subject: `📊 Your Weekly Performance Summary (${weekStart} - ${weekEnd})`,
          html,
        });

        if (emailError) {
          console.error(`Failed to send email to ${userEmail}:`, emailError);
          emailsFailed++;
          
          // Log failed email
          await supabase.from('email_logs').insert({
            user_id: userId,
            email_type: 'weekly_digest',
            recipient_email: userEmail,
            subject: `Your Weekly Performance Summary (${weekStart} - ${weekEnd})`,
            status: 'failed',
            error_message: emailError.message,
          });
        } else {
          console.log(`✓ Sent digest to ${userEmail}`);
          emailsSent++;
          
          // Log successful email
          await supabase.from('email_logs').insert({
            user_id: userId,
            email_type: 'weekly_digest',
            recipient_email: userEmail,
            subject: `Your Weekly Performance Summary (${weekStart} - ${weekEnd})`,
            status: 'sent',
            message_id: emailData?.id,
            metadata: {
              week_start: weekStart,
              week_end: weekEnd,
              total_audits: totalAudits,
              recommended_avg: recommendedAvg,
              user_configured_avg: userConfiguredAvg,
            },
          });
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        emailsFailed++;
      }
    }

    console.log("=== Weekly Digest Job Completed ===");
    console.log(`Emails sent: ${emailsSent}`);
    console.log(`Emails failed: ${emailsFailed}`);

    return new Response(
      JSON.stringify({
        message: 'Weekly digest processing completed',
        eligible_users: eligibleUsers.length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("=== FATAL ERROR ===");
    console.error(error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
