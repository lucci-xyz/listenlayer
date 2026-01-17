-- Add compound indexes for better query performance

-- Index for analytics queries on PlaybackEvent (episode + time range)
CREATE INDEX "PlaybackEvent_episodeId_createdAt_idx" ON "PlaybackEvent"("episodeId", "createdAt");

-- Index for listing episodes by feed sorted by date
CREATE INDEX "Episode_feedId_createdAt_idx" ON "Episode"("feedId", "createdAt");

-- Index for user dashboard queries (user's episodes sorted by date)
CREATE INDEX "Episode_userId_createdAt_idx" ON "Episode"("userId", "createdAt");
