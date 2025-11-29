-- Add new activity type for tracking unauthorized access attempts
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'unauthorized_access';