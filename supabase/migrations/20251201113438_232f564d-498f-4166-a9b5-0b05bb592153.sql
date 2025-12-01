-- Enable realtime for ticket_comments table
ALTER TABLE public.ticket_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;