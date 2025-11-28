-- Create public_shares table for shareable audit results
CREATE TABLE public.public_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_slug TEXT UNIQUE NOT NULL,
  user_prompt TEXT NOT NULL,
  model_a_name TEXT NOT NULL,
  model_a_response TEXT NOT NULL,
  model_b_name TEXT NOT NULL,
  model_b_response TEXT NOT NULL,
  synthesis TEXT NOT NULL,
  confidence REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  view_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view shared results (public read)
CREATE POLICY "Anyone can view public shares"
ON public.public_shares
FOR SELECT
USING (true);

-- Allow authenticated users to create shares
CREATE POLICY "Authenticated users can create shares"
ON public.public_shares
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow users to delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.public_shares
FOR DELETE
USING (auth.uid() = created_by);

-- Create index on share_slug for fast lookups
CREATE INDEX idx_public_shares_slug ON public.public_shares(share_slug);