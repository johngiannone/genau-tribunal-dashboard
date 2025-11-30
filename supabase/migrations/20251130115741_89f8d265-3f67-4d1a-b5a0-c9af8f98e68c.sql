-- Add industry column to organizations table
ALTER TABLE organizations ADD COLUMN industry TEXT;

-- Add check constraint for valid industries
ALTER TABLE organizations ADD CONSTRAINT valid_industry 
  CHECK (industry IN ('legal', 'medical', 'technology', 'finance', 'marketing'));

COMMENT ON COLUMN organizations.industry IS 'Industry vertical for AI model recommendations';