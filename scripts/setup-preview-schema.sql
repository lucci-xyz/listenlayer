-- Run this in Supabase SQL Editor to create the preview schema
-- This creates a separate namespace for preview environment data

-- Create the preview schema
CREATE SCHEMA IF NOT EXISTS preview;

-- Grant permissions (Supabase's default roles)
GRANT USAGE ON SCHEMA preview TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA preview TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA preview TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA preview TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA preview TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA preview GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA preview GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA preview GRANT USAGE, SELECT ON SEQUENCES TO postgres, service_role, authenticated;

-- Verify it was created
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'preview';
