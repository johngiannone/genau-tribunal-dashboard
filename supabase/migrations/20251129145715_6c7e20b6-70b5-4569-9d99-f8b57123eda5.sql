-- Create organization_billing table to track credit balance
CREATE TABLE public.organization_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  credit_balance NUMERIC NOT NULL DEFAULT 0.00,
  auto_recharge_enabled BOOLEAN DEFAULT false,
  auto_recharge_threshold NUMERIC DEFAULT 20.00,
  auto_recharge_amount NUMERIC DEFAULT 100.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_billing ENABLE ROW LEVEL SECURITY;

-- Policies for organization_billing
CREATE POLICY "Users can view their own billing"
  ON public.organization_billing
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own billing"
  ON public.organization_billing
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own billing"
  ON public.organization_billing
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all billing"
  ON public.organization_billing
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all billing"
  ON public.organization_billing
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create billing_transactions table to track all credit transactions
CREATE TABLE public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_added', 'credit_deducted', 'auto_recharge')),
  description TEXT,
  balance_after NUMERIC NOT NULL,
  model_used TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for billing_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.billing_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON public.billing_transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view all transactions"
  ON public.billing_transactions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_organization_billing_updated_at
  BEFORE UPDATE ON public.organization_billing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically create billing record for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.organization_billing (user_id, credit_balance)
  VALUES (NEW.id, 0.00);
  RETURN NEW;
END;
$$;

-- Trigger to create billing record on user signup
CREATE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_billing();

-- Create index for faster queries
CREATE INDEX idx_billing_transactions_user_id ON public.billing_transactions(user_id);
CREATE INDEX idx_billing_transactions_created_at ON public.billing_transactions(created_at DESC);
CREATE INDEX idx_organization_billing_user_id ON public.organization_billing(user_id);