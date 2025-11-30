import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { email, role, organization_id } = await req.json();

    if (!email || !organization_id) {
      throw new Error('Email and organization_id are required');
    }

    // Check if user is the organization owner
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('owner_id, max_members')
      .eq('id', organization_id)
      .single();

    if (orgError || !org || org.owner_id !== user.id) {
      throw new Error('Not authorized to invite members to this organization');
    }

    // Check member count
    const { count } = await supabaseClient
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id);

    if (count && count >= org.max_members) {
      throw new Error(`Organization has reached maximum member limit of ${org.max_members}`);
    }

    // Insert team member invite
    const { data: invite, error: inviteError } = await supabaseClient
      .from('team_members')
      .insert({
        organization_id,
        invited_email: email,
        role: role || 'member',
        invite_status: 'pending',
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    // Send invite email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (RESEND_API_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Genau <noreply@genau.io>',
          to: [email],
          subject: 'You\'ve been invited to join an organization',
          html: `
            <h2>Team Invitation</h2>
            <p>You've been invited to join an organization on Genau.</p>
            <p>Click the link below to accept:</p>
            <p><a href="${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${invite.id}&type=invite">Accept Invitation</a></p>
          `,
        }),
      });

      if (!emailRes.ok) {
        console.error('Failed to send email:', await emailRes.text());
      }
    }

    return new Response(
      JSON.stringify({ success: true, invite }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in invite-team-member:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
