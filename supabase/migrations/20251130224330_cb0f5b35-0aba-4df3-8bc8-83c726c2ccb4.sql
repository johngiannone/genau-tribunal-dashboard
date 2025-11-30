-- Add assigned_to column to support_tickets
ALTER TABLE public.support_tickets 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Create admin_specializations table to map admins to ticket subjects
CREATE TABLE public.admin_specializations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(admin_id, subject_type)
);

-- Enable RLS
ALTER TABLE public.admin_specializations ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage specializations
CREATE POLICY "Admins can view all specializations"
ON public.admin_specializations
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert specializations"
ON public.admin_specializations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete specializations"
ON public.admin_specializations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to auto-assign tickets based on subject and workload
CREATE OR REPLACE FUNCTION public.auto_assign_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_admin_id uuid;
BEGIN
  -- Find the admin with the specified specialization who has the least open tickets
  SELECT ur.user_id INTO assigned_admin_id
  FROM public.user_roles ur
  INNER JOIN public.admin_specializations asp ON ur.user_id = asp.admin_id
  WHERE ur.role = 'admin'::app_role
    AND asp.subject_type = NEW.subject
  GROUP BY ur.user_id
  ORDER BY (
    SELECT COUNT(*)
    FROM public.support_tickets st
    WHERE st.assigned_to = ur.user_id
      AND st.status IN ('open', 'in_progress')
  ) ASC
  LIMIT 1;

  -- If no specialized admin found, assign to any admin with least workload
  IF assigned_admin_id IS NULL THEN
    SELECT ur.user_id INTO assigned_admin_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::app_role
    GROUP BY ur.user_id
    ORDER BY (
      SELECT COUNT(*)
      FROM public.support_tickets st
      WHERE st.assigned_to = ur.user_id
        AND st.status IN ('open', 'in_progress')
    ) ASC
    LIMIT 1;
  END IF;

  -- Assign the ticket
  NEW.assigned_to := assigned_admin_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign on ticket creation
CREATE TRIGGER trigger_auto_assign_ticket
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_ticket();