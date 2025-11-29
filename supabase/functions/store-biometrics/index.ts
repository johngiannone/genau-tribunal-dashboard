import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null;
    
    // Try to get authenticated user (optional)
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
      if (user) {
        userId = user.id;
      }
    }

    const {
      sessionId,
      avgMouseVelocity,
      mouseVelocityVariance,
      avgMouseAcceleration,
      mousePathCurvature,
      totalMouseEvents,
      avgKeystrokeInterval,
      keystrokeIntervalVariance,
      totalKeystrokeEvents,
      timeToFirstClick,
      avgClickInterval,
      totalClickEvents,
      clickAccuracyScore,
      botLikelihoodScore,
      botIndicators,
    } = await req.json()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`📊 Biometrics received for session ${sessionId}:`, {
      userId,
      botScore: botLikelihoodScore,
      mouseEvents: totalMouseEvents,
      keystrokeEvents: totalKeystrokeEvents,
      clickEvents: totalClickEvents,
    });

    // Check if session already exists
    const { data: existing, error: checkError } = await supabaseClient
      .from('behavioral_signals')
      .select('id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing session:', checkError);
    }

    // Insert or update behavioral signals
    if (existing) {
      // Update existing record
      const { error: updateError } = await supabaseClient
        .from('behavioral_signals')
        .update({
          avg_mouse_velocity: avgMouseVelocity,
          mouse_velocity_variance: mouseVelocityVariance,
          avg_mouse_acceleration: avgMouseAcceleration,
          mouse_path_curvature: mousePathCurvature,
          total_mouse_events: totalMouseEvents,
          avg_keystroke_interval: avgKeystrokeInterval,
          keystroke_interval_variance: keystrokeIntervalVariance,
          total_keystroke_events: totalKeystrokeEvents,
          time_to_first_click: timeToFirstClick,
          avg_click_interval: avgClickInterval,
          total_click_events: totalClickEvents,
          click_accuracy_score: clickAccuracyScore,
          bot_likelihood_score: botLikelihoodScore,
          bot_indicators: botIndicators || [],
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Failed to update biometrics:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update biometrics' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabaseClient
        .from('behavioral_signals')
        .insert({
          user_id: userId,
          session_id: sessionId,
          avg_mouse_velocity: avgMouseVelocity,
          mouse_velocity_variance: mouseVelocityVariance,
          avg_mouse_acceleration: avgMouseAcceleration,
          mouse_path_curvature: mousePathCurvature,
          total_mouse_events: totalMouseEvents,
          avg_keystroke_interval: avgKeystrokeInterval,
          keystroke_interval_variance: keystrokeIntervalVariance,
          total_keystroke_events: totalKeystrokeEvents,
          time_to_first_click: timeToFirstClick,
          avg_click_interval: avgClickInterval,
          total_click_events: totalClickEvents,
          click_accuracy_score: clickAccuracyScore,
          bot_likelihood_score: botLikelihoodScore,
          bot_indicators: botIndicators || [],
        });

      if (insertError) {
        console.error('Failed to store biometrics:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to store biometrics' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    // Log warning if high bot score
    if (botLikelihoodScore >= 70) {
      console.warn(`⚠️ HIGH BOT LIKELIHOOD DETECTED (${botLikelihoodScore}%) for session ${sessionId}`);
      console.warn(`Bot indicators:`, botIndicators);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        botLikelihoodScore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in store-biometrics function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
