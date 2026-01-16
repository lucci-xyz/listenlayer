-- Migration: Simplify architecture - remove Site/Source, add Feed model
-- Episodes become standalone-capable with optional Feed relationship
-- Handles both fresh databases and upgrades from old schema

-- Step 1: Create Feed table
CREATE TABLE IF NOT EXISTS "Feed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "siteUrl" TEXT,
    "faviconUrl" TEXT,
    "latestItemTitle" TEXT,
    "latestItemUrl" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add new columns to Episode (if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Episode' AND column_name = 'userId') THEN
        ALTER TABLE "Episode" ADD COLUMN "userId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Episode' AND column_name = 'feedId') THEN
        ALTER TABLE "Episode" ADD COLUMN "feedId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Episode' AND column_name = 'format') THEN
        ALTER TABLE "Episode" ADD COLUMN "format" TEXT;
    END IF;
END $$;

-- Step 3-4: Only migrate data if old tables exist
DO $$
BEGIN
    -- Check if Site table exists (old schema)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Site') THEN
        -- Migrate existing episodes - set userId from Site
        UPDATE "Episode" e
        SET "userId" = s."userId"
        FROM "Site" s
        WHERE e."siteId" = s."id" AND e."userId" IS NULL;

        -- Create Feed entries from RSS Sources and link episodes
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Source') THEN
            INSERT INTO "Feed" ("id", "userId", "name", "feedUrl", "siteUrl", "faviconUrl", "latestItemTitle", "latestItemUrl", "lastFetchedAt", "lastError", "createdAt")
            SELECT 
                src."id",
                site."userId",
                COALESCE(src."displayName", site."name"),
                src."url",
                site."domain",
                src."faviconUrl",
                src."latestItemTitle",
                src."latestItemUrl",
                src."lastFetchedAt",
                src."lastError",
                src."createdAt"
            FROM "Source" src
            JOIN "Site" site ON src."siteId" = site."id"
            WHERE src."type" = 'RSS'
            ON CONFLICT DO NOTHING;

            -- Link episodes to their feeds (for RSS sources)
            UPDATE "Episode" e
            SET "feedId" = src."id"
            FROM "Source" src
            WHERE e."sourceId" = src."id" AND src."type" = 'RSS' AND e."feedId" IS NULL;
        END IF;
    END IF;
END $$;

-- Step 5: Make userId NOT NULL (only if column exists and has no nulls)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Episode' AND column_name = 'userId' AND is_nullable = 'YES') THEN
        -- Check if there are any null values
        IF NOT EXISTS (SELECT 1 FROM "Episode" WHERE "userId" IS NULL) THEN
            ALTER TABLE "Episode" ALTER COLUMN "userId" SET NOT NULL;
        END IF;
    END IF;
END $$;

-- Step 6: Drop old columns and tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Episode_siteId_fkey') THEN
        ALTER TABLE "Episode" DROP CONSTRAINT "Episode_siteId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Episode_sourceId_fkey') THEN
        ALTER TABLE "Episode" DROP CONSTRAINT "Episode_sourceId_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Episode' AND column_name = 'siteId') THEN
        ALTER TABLE "Episode" DROP COLUMN "siteId";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Episode' AND column_name = 'sourceId') THEN
        ALTER TABLE "Episode" DROP COLUMN "sourceId";
    END IF;
END $$;

DROP TABLE IF EXISTS "Source";
DROP TABLE IF EXISTS "Site";

-- Step 7: Drop old enum
DROP TYPE IF EXISTS "SourceType";

-- Step 8: Add foreign keys (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Feed_userId_fkey') THEN
        ALTER TABLE "Feed" ADD CONSTRAINT "Feed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Episode_userId_fkey') THEN
        ALTER TABLE "Episode" ADD CONSTRAINT "Episode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Episode_feedId_fkey') THEN
        ALTER TABLE "Episode" ADD CONSTRAINT "Episode_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 9: Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS "Feed_userId_idx" ON "Feed"("userId");
CREATE INDEX IF NOT EXISTS "Episode_userId_idx" ON "Episode"("userId");
CREATE INDEX IF NOT EXISTS "Episode_feedId_idx" ON "Episode"("feedId");
CREATE INDEX IF NOT EXISTS "Episode_status_idx" ON "Episode"("status");
