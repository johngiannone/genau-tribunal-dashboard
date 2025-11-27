-- Add INSERT policy for user_usage table so users can create their own usage records
CREATE POLICY "Users can create own usage"
ON public.user_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);