-- Allow users to mark their own tickets as resolved
CREATE POLICY "Users can mark own tickets as resolved"
ON support_tickets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('open', 'in_progress'))
WITH CHECK (status = 'resolved');