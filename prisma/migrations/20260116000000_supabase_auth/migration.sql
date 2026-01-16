-- Migration: Switch to Supabase Auth
-- Remove custom email verification, add Supabase ID link

-- Add supabaseId to User for linking with Supabase Auth
ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- Remove password and email verification fields (Supabase handles these)
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerifiedAt";

-- Drop EmailVerificationToken table if it exists
DROP TABLE IF EXISTS "EmailVerificationToken";
