-- Add field to track when subscription is set to cancel at period end
-- This allows showing "Canceling" status to users who canceled but still have access
ALTER TABLE "User" ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN;
