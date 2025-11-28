-- Allow admins to view all user usage records
CREATE POLICY "Admins can view all user usage"
ON public.user_usage
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all user usage records
CREATE POLICY "Admins can update all user usage"
ON public.user_usage
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));