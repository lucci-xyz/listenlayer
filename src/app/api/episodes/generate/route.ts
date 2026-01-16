import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { randomBytes } from "node:crypto";
import Parser from "rss-parser";

// New simplified schema - just needs a URL
const schema = z.object({
  url: z.string().url(),
  feedId: z.string().optional(), // Optional - for episodes from a feed subscription
  format: z.enum(["narration", "two-host", "tldr"]).optional(),
  title: z.string().optional(),
  sourceText: z.string().min(1).optional(),
});

// Schema for generating from a feed (multiple items)
const feedSchema = z.object({
  feedId: z.string().min(1),
  format: z.enum(["narration", "two-host", "tldr"]).optional(),
  count: z.number().int().min(1).max(10).optional(),
});

function makePublicId() {
  return randomBytes(8).toString("hex");
}

const INSUFFICIENT_CREDITS_ERROR = "INSUFFICIENT_CREDITS";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    
    // Try simple URL-based generation first
    const urlParsed = schema.safeParse(body);
    if (urlParsed.success) {
      return handleUrlGeneration(user, urlParsed.data);
    }
    
    // Try feed-based generation
    const feedParsed = feedSchema.safeParse(body);
    if (feedParsed.success) {
      return handleFeedGeneration(user, feedParsed.data);
    }
    
    return NextResponse.json({ error: "Invalid payload - provide url or feedId" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// Generate episode from a single URL (standalone or from feed)
async function handleUrlGeneration(
  user: { id: string },
  data: { url: string; feedId?: string; format?: string; title?: string; sourceText?: string }
) {
  // Verify feed ownership if feedId provided
  if (data.feedId) {
    const feed = await prisma.feed.findFirst({
      where: { id: data.feedId, userId: user.id },
    });
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }
  }

  const episodeData = {
    userId: user.id,
    feedId: data.feedId || null,
    title: data.title || "Generating...",
    sourceUrl: data.url,
    status: "QUEUED" as const,
    format: data.format || null,
    scriptText: "",
    transcriptText: "",
    chaptersJson: [],
    errorMessage: null as string | null,
    publicId: makePublicId(),
  };

  try {
    const episode = await prisma.$transaction(async (tx) => {
      // Check and decrement credits
      const update = await tx.user.updateMany({
        where: { id: user.id, episodeCredits: { gte: 1 } },
        data: { episodeCredits: { decrement: 1 } },
      });

      if (update.count === 0) {
        throw new Error(INSUFFICIENT_CREDITS_ERROR);
      }

      const created = await tx.episode.create({ data: episodeData });

      await tx.usageRecord.create({
        data: {
          userId: user.id,
          episodeId: created.id,
          credits: -1,
          reason: "episode_generation",
        },
      });

      return created;
    });

    // Queue the generation job
    await inngest.send({
      name: "episode/generate.requested",
      data: {
        userId: user.id,
        episodeId: episode.id,
        feedId: data.feedId || null,
        canonicalUrl: data.url,
        episodeTitle: data.title,
        format: data.format,
        sourceText: data.sourceText,
      },
    });

    return NextResponse.json({ episodeId: episode.id, publicId: episode.publicId });
  } catch (error) {
    if (error instanceof Error && error.message === INSUFFICIENT_CREDITS_ERROR) {
      return NextResponse.json({ error: "Out of credits" }, { status: 402 });
    }
    throw error;
  }
}

// Generate episodes from a feed subscription (batch)
async function handleFeedGeneration(
  user: { id: string },
  data: { feedId: string; format?: string; count?: number }
) {
  const feed = await prisma.feed.findFirst({
    where: { id: data.feedId, userId: user.id },
  });
  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }

  const requestedCount = data.count ?? 1;
  const parser = new Parser();

  // Fetch feed items
  const feedData = await parser.parseURL(feed.feedUrl);
  const items = (feedData.items || []).filter((item) => item?.link);
  const selected = items.slice(0, requestedCount);

  if (selected.length === 0) {
    return NextResponse.json({ error: "No items found in feed" }, { status: 400 });
  }

  type EpisodeSeed = { title: string; canonicalUrl: string };
  const seeds: EpisodeSeed[] = selected.map((item) => ({
    title: item.title || feedData.title || "Episode",
    canonicalUrl: item.link as string,
  }));

  const episodesToCreate = seeds.map((seed) => ({
    userId: user.id,
    feedId: feed.id,
    title: seed.title,
    sourceUrl: seed.canonicalUrl,
    status: "QUEUED" as const,
    format: data.format || null,
    scriptText: "",
    transcriptText: "",
    chaptersJson: [],
    errorMessage: null as string | null,
    publicId: makePublicId(),
  }));

  try {
    const createdEpisodes = await prisma.$transaction(async (tx) => {
      const update = await tx.user.updateMany({
        where: { id: user.id, episodeCredits: { gte: episodesToCreate.length } },
        data: { episodeCredits: { decrement: episodesToCreate.length } },
      });

      if (update.count === 0) {
        throw new Error(INSUFFICIENT_CREDITS_ERROR);
      }

      const created = [];
      for (const payload of episodesToCreate) {
        const episode = await tx.episode.create({ data: payload });
        created.push(episode);
      }

      await tx.usageRecord.createMany({
        data: created.map((episode) => ({
          userId: user.id,
          episodeId: episode.id,
          credits: -1,
          reason: "episode_generation",
        })),
      });

      return created;
    });

    // Queue generation jobs
    const episodeIds: string[] = [];
    for (const [index, episode] of createdEpisodes.entries()) {
      episodeIds.push(episode.id);
      const seed = seeds[index];
      await inngest.send({
        name: "episode/generate.requested",
        data: {
          userId: user.id,
          episodeId: episode.id,
          feedId: feed.id,
          canonicalUrl: seed.canonicalUrl,
          episodeTitle: seed.title,
          format: data.format,
        },
      });
    }

    return NextResponse.json({ episodeId: episodeIds[0] || null, episodeIds });
  } catch (error) {
    if (error instanceof Error && error.message === INSUFFICIENT_CREDITS_ERROR) {
      return NextResponse.json({ error: "Out of credits" }, { status: 402 });
    }
    throw error;
  }
}
