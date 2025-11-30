-- Drop the existing foreign key to auth.users
ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;

-- Add foreign key to profiles instead
ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_assigned_to_profiles_fkey
FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;