-- Create function to auto-escalate ticket priority based on age
CREATE OR REPLACE FUNCTION escalate_ticket_priority()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ticket_record RECORD;
  new_priority text;
  escalated boolean;
BEGIN
  -- Iterate through open and in_progress tickets
  FOR ticket_record IN 
    SELECT id, priority, status, created_at, user_id, subject
    FROM support_tickets
    WHERE status IN ('open', 'in_progress')
  LOOP
    escalated := false;
    new_priority := ticket_record.priority;
    
    -- Low → Medium after 48 hours
    IF ticket_record.priority = 'low' 
       AND ticket_record.created_at < NOW() - INTERVAL '48 hours' THEN
      new_priority := 'medium';
      escalated := true;
    END IF;
    
    -- Medium → High after 72 additional hours (120 hours total from creation)
    IF ticket_record.priority = 'medium' 
       AND ticket_record.created_at < NOW() - INTERVAL '120 hours' THEN
      new_priority := 'high';
      escalated := true;
    END IF;
    
    -- Update ticket if escalation occurred
    IF escalated THEN
      UPDATE support_tickets
      SET priority = new_priority, updated_at = NOW()
      WHERE id = ticket_record.id;
      
      -- Log the escalation
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        ticket_record.user_id,
        'admin_change',
        format('Ticket #%s auto-escalated from %s to %s priority', 
               SUBSTRING(ticket_record.id::text, 1, 8), 
               ticket_record.priority, 
               new_priority),
        jsonb_build_object(
          'ticket_id', ticket_record.id,
          'old_priority', ticket_record.priority,
          'new_priority', new_priority,
          'subject', ticket_record.subject,
          'ticket_age_hours', EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 3600,
          'automated', true,
          'escalation_type', 'time_based'
        )
      );
    END IF;
  END LOOP;
END;
$$;