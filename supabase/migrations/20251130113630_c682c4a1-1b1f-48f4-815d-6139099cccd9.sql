-- Add new activity types for monetization feature tracking
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'turbo_mode_used';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'expert_marketplace_clicked';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'folder_created';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'conversation_moved_to_folder';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'team_member_invited';