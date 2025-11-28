-- Create enum for account status
CREATE TYPE public.account_status AS ENUM ('active', 'inactive', 'disabled');

-- Add account_status column to user_usage table with default 'active'
ALTER TABLE public.user_usage
ADD COLUMN account_status public.account_status NOT NULL DEFAULT 'active';

-- Create index for faster filtering by status
CREATE INDEX idx_user_usage_account_status ON public.user_usage(account_status);

-- Add comment to document the column
COMMENT ON COLUMN public.user_usage.account_status IS 'Account status: active (normal operation), inactive (temporary suspension), disabled (permanent deactivation)';
