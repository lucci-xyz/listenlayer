-- Migration: Simplify architecture - remove Site/Source, add Feed model
-- Episodes become standalone-capable with optional Feed relationship

-- Step 1: Create Feed table
CREATE TABLE "Feed" (
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

-- Step 2: Add new columns to Episode
ALTER TABLE "Episode" ADD COLUMN "userId" TEXT;
ALTER TABLE "Episode" ADD COLUMN "feedId" TEXT;
ALTER TABLE "Episode" ADD COLUMN "format" TEXT;

-- Step 3: Migrate existing episodes - set userId from Site, feedId from Source if RSS
UPDATE "Episode" e
SET "userId" = s."userId"
FROM "Site" s
WHERE e."siteId" = s."id";

-- Step 4: Create Feed entries from RSS Sources and link episodes
INSERT INTO "Feed" ("id", "userId", "name", "feedUrl", "siteUrl", "faviconUrl", "latestItemTitle", "latestItemUrl", "lastFetchedAt", "lastError", "createdAt")
SELECT 
    src."id",
    site."userId",
    COALESCE(src."displayName", site."name"),
    src."url",
    site."domain",
    COALESCE(src."faviconUrl", site."faviconUrl"),
    src."latestItemTitle",
    src."latestItemUrl",
    src."lastFetchedAt",
    src."lastError",
    src."createdAt"
FROM "Source" src
JOIN "Site" site ON src."siteId" = site."id"
WHERE src."type" = 'RSS';

-- Link episodes to their feeds (for RSS sources)
UPDATE "Episode" e
SET "feedId" = src."id"
FROM "Source" src
WHERE e."sourceId" = src."id" AND src."type" = 'RSS';

-- Step 5: Make userId required (should have data now)
ALTER TABLE "Episode" ALTER COLUMN "userId" SET NOT NULL;

-- Step 6: Drop old columns and tables
ALTER TABLE "Episode" DROP CONSTRAINT IF EXISTS "Episode_siteId_fkey";
ALTER TABLE "Episode" DROP CONSTRAINT IF EXISTS "Episode_sourceId_fkey";
ALTER TABLE "Episode" DROP COLUMN "siteId";
ALTER TABLE "Episode" DROP COLUMN "sourceId";

DROP TABLE IF EXISTS "Source";
DROP TABLE IF EXISTS "Site";

-- Step 7: Drop old enum
DROP TYPE IF EXISTS "SourceType";

-- Step 8: Add foreign keys
ALTER TABLE "Feed" ADD CONSTRAINT "Feed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 9: Create indexes
CREATE INDEX "Feed_userId_idx" ON "Feed"("userId");
CREATE INDEX "Episode_userId_idx" ON "Episode"("userId");
CREATE INDEX "Episode_feedId_idx" ON "Episode"("feedId");
CREATE INDEX "Episode_status_idx" ON "Episode"("status");
