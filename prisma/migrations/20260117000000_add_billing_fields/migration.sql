-- Add billing and subscription fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPriceId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionCurrentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "episodeCredits" INTEGER NOT NULL DEFAULT 3;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_subscriptionId_key" ON "User"("subscriptionId");

-- Create SubscriptionStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create UsageRecord table
CREATE TABLE IF NOT EXISTS "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT,
    "credits" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for UsageRecord
DO $$ BEGIN
    ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for UsageRecord
CREATE INDEX IF NOT EXISTS "UsageRecord_userId_idx" ON "UsageRecord"("userId");
CREATE INDEX IF NOT EXISTS "UsageRecord_createdAt_idx" ON "UsageRecord"("createdAt");
