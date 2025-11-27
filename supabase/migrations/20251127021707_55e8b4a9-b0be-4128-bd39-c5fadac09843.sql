-- Create user_usage table to track audit counts and premium status
CREATE TABLE public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  audit_count INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own usage
CREATE POLICY "Users can read own usage"
  ON public.user_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own usage (for incrementing count)
CREATE POLICY "Users can update own usage"
  ON public.user_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to create user_usage entry for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_usage (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to automatically create usage entry when user signs up
CREATE TRIGGER on_auth_user_created_usage
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_usage();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON public.user_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();