import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { randomBytes } from "node:crypto";
import Parser from "rss-parser";

const authSchema = z
  .object({
    type: z.enum(["basic", "bearer"]),
    username: z.string().optional(),
    password: z.string().optional(),
    token: z.string().optional(),
  })
  .optional();

// New simplified schema - just needs a URL
const schema = z.object({
  url: z.string().url(),
  feedId: z.string().optional(), // Optional - for episodes from a feed subscription
  format: z.enum(["narration", "two-host", "tldr"]).optional(),
  title: z.string().optional(),
  sourceText: z.string().min(1).optional(),
  auth: authSchema,
});

// Schema for generating from a feed (multiple items)
const feedSchema = z.object({
  feedId: z.string().min(1),
  format: z.enum(["narration", "two-host", "tldr"]).optional(),
  count: z.number().int().min(1).max(10).optional(),
  auth: authSchema,
});

function makePublicId() {
  return randomBytes(8).toString("hex");
}

const INSUFFICIENT_CREDITS_ERROR = "INSUFFICIENT_CREDITS";
const MIN_SOURCE_WORDS = 120;
const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

type SourceAuth = {
  type: "basic" | "bearer";
  username?: string;
  password?: string;
  token?: string;
};

function normalizeAuth(auth?: SourceAuth | null): SourceAuth | null {
  if (!auth) return null;
  if (auth.type === "basic" && auth.username && auth.password) {
    return { type: "basic", username: auth.username, password: auth.password };
  }
  if (auth.type === "bearer" && auth.token) {
    return { type: "bearer", token: auth.token };
  }
  return null;
}

function buildAuthHeaders(auth?: SourceAuth | null): Record<string, string> {
  if (!auth) return {};
  if (auth.type === "basic" && auth.username && auth.password) {
    const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
  if (auth.type === "bearer" && auth.token) {
    return { Authorization: `Bearer ${auth.token}` };
  }
  return {};
}

function countWords(text?: string | null) {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function getAuthHint(response: Response) {
  const header = response.headers.get("www-authenticate")?.toLowerCase() || "";
  if (header.includes("basic")) return "basic";
  if (header.includes("bearer")) return "bearer";
  return null;
}

async function checkSourceAccess(url: string, authHeaders: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { ...defaultHeaders, ...authHeaders },
      signal: controller.signal,
    });
    res.body?.cancel();
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

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
  data: {
    url: string;
    feedId?: string;
    format?: string;
    title?: string;
    sourceText?: string;
    auth?: SourceAuth;
  }
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

  const sourceAuth = normalizeAuth(data.auth);
  const authHeaders = buildAuthHeaders(sourceAuth);
  const sourceWordCount = countWords(data.sourceText);
  const needsSourceCheck = sourceWordCount < MIN_SOURCE_WORDS;

  if (needsSourceCheck) {
    try {
      const res = await checkSourceAccess(data.url, authHeaders);
      console.info("[generate] preflight", {
        url: data.url,
        status: res.status,
        ok: res.ok,
        hasAuth: Boolean(sourceAuth),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          const authHint = getAuthHint(res);
          const message = sourceAuth
            ? "Credentials were rejected or are insufficient."
            : "Source requires authentication. Add credentials to continue.";
          return NextResponse.json(
            { error: message, code: "FORBIDDEN", status: res.status, authHint },
            { status: 403 }
          );
        }
        if (res.status === 404 || res.status === 410) {
          return NextResponse.json(
            { error: "Source not found", status: res.status },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { error: `Source unavailable (${res.status})`, status: res.status },
          { status: 400 }
        );
      }
    } catch (error) {
      console.info("[generate] preflight error", {
        url: data.url,
        message: error instanceof Error ? error.message : "Unknown error",
        hasAuth: Boolean(sourceAuth),
      });
      return NextResponse.json(
        { error: "Unable to reach source" },
        { status: 400 }
      );
    }
  } else {
    console.info("[generate] preflight skipped (sourceText)", {
      url: data.url,
      sourceWordCount,
      hasAuth: Boolean(sourceAuth),
    });
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
        sourceAuth,
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
  data: { feedId: string; format?: string; count?: number; auth?: SourceAuth }
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

  const sourceAuth = normalizeAuth(data.auth);
  const authHeaders = buildAuthHeaders(sourceAuth);
  const blocked: { url: string; status: number }[] = [];
  let authHint: "basic" | "bearer" | null = null;

  for (const seed of seeds) {
    try {
      const res = await checkSourceAccess(seed.canonicalUrl, authHeaders);
      console.info("[generate] preflight", {
        url: seed.canonicalUrl,
        status: res.status,
        ok: res.ok,
        hasAuth: Boolean(sourceAuth),
      });
      if (!res.ok) {
        blocked.push({ url: seed.canonicalUrl, status: res.status });
        if (!authHint && (res.status === 401 || res.status === 403)) {
          authHint = getAuthHint(res);
        }
      }
    } catch (error) {
      console.info("[generate] preflight error", {
        url: seed.canonicalUrl,
        message: error instanceof Error ? error.message : "Unknown error",
        hasAuth: Boolean(sourceAuth),
      });
      blocked.push({ url: seed.canonicalUrl, status: 0 });
    }
  }

  if (blocked.length > 0) {
    const hasAuth = Boolean(sourceAuth);
    const blockedStatuses = blocked.map((entry) => entry.status);
    if (blockedStatuses.some((status) => status === 401 || status === 403)) {
      const message = hasAuth
        ? "Credentials were rejected or are insufficient."
        : "One or more sources require authentication. Add credentials to continue.";
      return NextResponse.json(
        { error: message, code: "FORBIDDEN", blocked, authHint },
        { status: 403 }
      );
    }
    if (blockedStatuses.some((status) => status === 404 || status === 410)) {
      return NextResponse.json(
        { error: "One or more sources were not found.", blocked },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "One or more sources are unavailable.", blocked },
      { status: 400 }
    );
  }

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
          sourceAuth,
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
