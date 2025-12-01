-- Add data retention policy column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.profiles.data_retention_days IS 'Number of days to retain audit history. NULL means forever. Common values: 30, 90, 365';
