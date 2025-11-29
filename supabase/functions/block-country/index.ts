import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { countryCode, durationHours } = await req.json();

    if (!countryCode || !durationHours) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: countryCode, durationHours' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Blocking country ${countryCode} for ${durationHours} hours by admin ${user.email}`);

    // Create a special marker entry for country-level block
    const blockExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    
    // Insert a special blocked_ips entry that represents a country-wide block
    const { error: insertError } = await supabaseClient
      .from('blocked_ips')
      .insert({
        ip_address: `COUNTRY_BLOCK_${countryCode}`,
        country_code: countryCode,
        blocked_reason: `Country-level block activated by admin for ${durationHours} hours`,
        block_expires_at: blockExpiresAt.toISOString(),
        is_permanent: false,
        metadata: {
          country_block: true,
          blocked_by: user.id,
          blocked_by_email: user.email,
          duration_hours: durationHours,
        }
      });

    if (insertError) {
      console.error('Error inserting country block:', insertError);
      throw insertError;
    }

    // Log the activity
    await supabaseClient
      .from('activity_logs')
      .insert({
        user_id: user.id,
        activity_type: 'admin_change',
        description: `Country-level block activated for ${countryCode}`,
        metadata: {
          country_code: countryCode,
          duration_hours: durationHours,
          expires_at: blockExpiresAt.toISOString(),
          block_type: 'country_wide',
        }
      });

    console.log(`Successfully blocked country ${countryCode} until ${blockExpiresAt.toISOString()}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Country ${countryCode} blocked for ${durationHours} hours`,
        expiresAt: blockExpiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error blocking country:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
