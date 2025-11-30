-- Create organization knowledge base table for domain-specific documents
CREATE TABLE public.organization_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  document_type TEXT, -- 'legal_precedent', 'medical_guideline', 'technical_spec', 'compliance_doc', 'other'
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.organization_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policy: Organization members can view their org's knowledge base
CREATE POLICY "Org members can view org knowledge base"
ON public.organization_knowledge_base
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Organization members can upload documents
CREATE POLICY "Org members can upload to knowledge base"
ON public.organization_knowledge_base
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Organization members can update their org's documents
CREATE POLICY "Org members can update org knowledge base"
ON public.organization_knowledge_base
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Organization members can delete documents they uploaded
CREATE POLICY "Org members can delete own uploads"
ON public.organization_knowledge_base
FOR DELETE
USING (
  uploaded_by = auth.uid() AND
  organization_id IN (
    SELECT organization_id 
    FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_org_knowledge_base_org_id ON public.organization_knowledge_base(organization_id);
CREATE INDEX idx_org_knowledge_base_active ON public.organization_knowledge_base(is_active) WHERE is_active = true;