import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting data retention cleanup...');

    // Fetch all users with retention policies
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, data_retention_days')
      .not('data_retention_days', 'is', null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`Found ${profiles?.length || 0} users with retention policies`);

    let deletedCount = 0;
    let processedUsers = 0;

    // Process each user's retention policy
    for (const profile of profiles || []) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - profile.data_retention_days);
      const cutoffISO = cutoffDate.toISOString();

      console.log(`Processing user ${profile.id} (${profile.email}): deleting data older than ${cutoffISO}`);

      // Delete old conversations and their messages
      const { data: oldConversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', profile.id)
        .lt('created_at', cutoffISO);

      if (!conversationsError && oldConversations && oldConversations.length > 0) {
        const conversationIds = oldConversations.map(c => c.id);

        // Delete messages first (due to foreign key)
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        if (messagesError) {
          console.error(`Failed to delete messages for user ${profile.id}:`, messagesError);
        }

        // Delete conversations
        const { error: deleteConvError } = await supabase
          .from('conversations')
          .delete()
          .in('id', conversationIds);

        if (deleteConvError) {
          console.error(`Failed to delete conversations for user ${profile.id}:`, deleteConvError);
        } else {
          console.log(`Deleted ${conversationIds.length} conversations for user ${profile.id}`);
          deletedCount += conversationIds.length;
        }
      }

      // Delete old training dataset entries (audit history)
      const { error: auditsError, count: auditsDeleted } = await supabase
        .from('training_dataset')
        .delete({ count: 'exact' })
        .eq('user_id', profile.id)
        .lt('created_at', cutoffISO);

      if (auditsError) {
        console.error(`Failed to delete audits for user ${profile.id}:`, auditsError);
      } else {
        console.log(`Deleted ${auditsDeleted || 0} audit records for user ${profile.id}`);
        deletedCount += (auditsDeleted || 0);
      }

      // Delete old activity logs
      const { error: activityError, count: activityDeleted } = await supabase
        .from('activity_logs')
        .delete({ count: 'exact' })
        .eq('user_id', profile.id)
        .lt('created_at', cutoffISO);

      if (activityError) {
        console.error(`Failed to delete activity logs for user ${profile.id}:`, activityError);
      } else {
        console.log(`Deleted ${activityDeleted || 0} activity logs for user ${profile.id}`);
        deletedCount += (activityDeleted || 0);
      }

      processedUsers++;
    }

    const result = {
      success: true,
      processed_users: processedUsers,
      total_records_deleted: deletedCount,
      timestamp: new Date().toISOString(),
    };

    console.log('Cleanup complete:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: `Cleanup failed: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
