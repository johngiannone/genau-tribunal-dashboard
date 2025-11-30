-- Enable real-time for activity_logs table to support live cost monitoring
ALTER TABLE activity_logs REPLICA IDENTITY FULL;

-- Verify table is in supabase_realtime publication (should already be enabled)
-- This enables real-time subscriptions for activity_logs changes