import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RiskSignal {
  userId: string;
  email: string;
  fingerprintCollision: boolean;
  fingerprintCollisionCount: number;
  highBotScore: boolean;
  botScore: number;
  timezoneMismatch: boolean;
  vpnDetected: boolean;
  riskScore: number;
  riskFactors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Starting security risk analysis...');

    // Get all active users (not already banned)
    const { data: activeUsers, error: usersError } = await supabase
      .from('user_usage')
      .select('user_id, is_banned')
      .eq('is_banned', false);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const riskSignals: RiskSignal[] = [];
    const autoBannedUsers: string[] = [];

    // Analyze each user
    for (const user of activeUsers || []) {
      const userId = user.user_id;
      
      // Get user email
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const email = authUser?.user?.email || 'unknown';

      let riskScore = 0;
      const riskFactors: string[] = [];

      // 1. Check fingerprint collision (weight: 30 points)
      const { data: fingerprints } = await supabase
        .from('user_fingerprints')
        .select('fingerprint_hash, user_id')
        .eq('user_id', userId)
        .order('collected_at', { ascending: false })
        .limit(1);

      let fingerprintCollision = false;
      let fingerprintCollisionCount = 0;

      if (fingerprints && fingerprints.length > 0) {
        const { data: collisions } = await supabase
          .from('user_fingerprints')
          .select('user_id')
          .eq('fingerprint_hash', fingerprints[0].fingerprint_hash)
          .neq('user_id', userId);

        if (collisions && collisions.length > 0) {
          fingerprintCollision = true;
          fingerprintCollisionCount = collisions.length;
          riskScore += 30;
          riskFactors.push(`Fingerprint shared with ${collisions.length} other user(s)`);
        }
      }

      // 2. Check bot likelihood score (weight: 40 points if >70)
      const { data: botSignals } = await supabase
        .from('behavioral_signals')
        .select('bot_likelihood_score')
        .eq('user_id', userId)
        .order('collected_at', { ascending: false })
        .limit(1);

      let highBotScore = false;
      let botScore = 0;

      if (botSignals && botSignals.length > 0) {
        botScore = botSignals[0].bot_likelihood_score || 0;
        if (botScore >= 70) {
          highBotScore = true;
          riskScore += 40;
          riskFactors.push(`High bot likelihood score: ${botScore}%`);
        }
      }

      // 3. Check timezone mismatch (weight: 20 points)
      const { data: blockedIps } = await supabase
        .from('blocked_ips')
        .select('fraud_score, is_vpn, is_proxy, is_tor, country_code')
        .eq('associated_user_id', userId)
        .order('blocked_at', { ascending: false })
        .limit(1);

      let timezoneMismatch = false;
      let vpnDetected = false;

      if (blockedIps && blockedIps.length > 0) {
        const ip = blockedIps[0];
        if (ip.fraud_score && ip.fraud_score >= 75) {
          timezoneMismatch = true;
          riskScore += 20;
          riskFactors.push(`Fraud score: ${ip.fraud_score}`);
        }

        if (ip.is_vpn || ip.is_proxy || ip.is_tor) {
          vpnDetected = true;
          riskScore += 15;
          riskFactors.push(`VPN/Proxy detected from ${ip.country_code || 'unknown'}`);
        }
      }

      // If risk score >= 70, auto-ban the user
      if (riskScore >= 70) {
        console.log(`🚨 Auto-banning user ${userId} with risk score ${riskScore}`);
        
        const banReason = `Automated ban: Multiple risk signals detected (Risk Score: ${riskScore}/100). Factors: ${riskFactors.join('; ')}`;

        // Update user_usage to ban the user
        await supabase
          .from('user_usage')
          .update({
            is_banned: true,
            banned_at: new Date().toISOString(),
            ban_reason: banReason,
          })
          .eq('user_id', userId);

        // Log the ban event
        await supabase
          .from('activity_logs')
          .insert({
            user_id: userId,
            activity_type: 'admin_change',
            description: banReason,
            metadata: {
              automated: true,
              risk_score: riskScore,
              risk_factors: riskFactors,
              fingerprint_collision: fingerprintCollision,
              high_bot_score: highBotScore,
              timezone_mismatch: timezoneMismatch,
              vpn_detected: vpnDetected,
            },
          });

        autoBannedUsers.push(userId);
      }

      // Store risk signal for reporting
      if (riskScore > 30) { // Only track medium+ risk users
        riskSignals.push({
          userId,
          email,
          fingerprintCollision,
          fingerprintCollisionCount,
          highBotScore,
          botScore,
          timezoneMismatch,
          vpnDetected,
          riskScore,
          riskFactors,
        });
      }
    }

    console.log(`✅ Analysis complete. Banned ${autoBannedUsers.length} users.`);
    console.log(`📊 Identified ${riskSignals.length} users with elevated risk.`);

    return new Response(
      JSON.stringify({
        success: true,
        autoBannedCount: autoBannedUsers.length,
        autoBannedUsers,
        riskSignalsCount: riskSignals.length,
        riskSignals: riskSignals.slice(0, 10), // Return top 10 for preview
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-security-risks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
