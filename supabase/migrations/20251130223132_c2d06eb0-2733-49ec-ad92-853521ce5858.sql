-- Create support_tickets table for bug reporting
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or not) to create tickets
CREATE POLICY "Anyone can create support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Allow users to view their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update tickets (status, priority, etc.)
CREATE POLICY "Admins can update tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();