-- Create brand_documents table for Custom Knowledge Base feature
CREATE TABLE public.brand_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one active document per user
CREATE UNIQUE INDEX idx_brand_docs_active_user 
  ON public.brand_documents(user_id) 
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.brand_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own brand docs" 
  ON public.brand_documents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brand docs" 
  ON public.brand_documents FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand docs" 
  ON public.brand_documents FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand docs" 
  ON public.brand_documents FOR DELETE 
  USING (auth.uid() = user_id);

-- Create private knowledge-base storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false);

-- Storage RLS policies
CREATE POLICY "Users can upload to knowledge-base"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own knowledge-base files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own knowledge-base files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'knowledge-base' AND auth.uid()::text = (storage.foldername(name))[1]);