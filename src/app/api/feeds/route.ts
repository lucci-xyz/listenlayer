import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Parser from "rss-parser";
import { isAllowedAppOrigin } from "@/lib/security";
import { validateFeedUrl, SSRFError } from "@/lib/url-validator";
import { fetchWithTimeout, feedHeaders } from "@/lib/fetch";

const createSchema = z.object({
  feedUrl: z.string().url(),
  name: z.string().min(1).optional(),
  siteUrl: z.string().url().optional(),
  faviconUrl: z.string().url().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    
    const feeds = await prisma.feed.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { episodes: true } },
      },
    });

    return NextResponse.json({ feeds });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  // CSRF protection
  if (!isAllowedAppOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // SSRF validation
    try {
      validateFeedUrl(parsed.data.feedUrl);
    } catch (error) {
      if (error instanceof SSRFError) {
        return NextResponse.json({ error: "Feed URL not allowed" }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid feed URL" }, { status: 400 });
    }

    // Validate the feed URL by fetching it
    const parser = new Parser();
    let feedTitle: string | undefined;
    let latestItemTitle: string | null = null;
    let latestItemUrl: string | null = null;

    try {
      const response = await fetchWithTimeout(parsed.data.feedUrl, {
        redirect: "follow",
        timeoutMs: 12000,
        headers: feedHeaders,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`);
      }
      const xml = await response.text();
      const feed = await parser.parseString(xml);
      
      if (!feed.items || feed.items.length === 0) {
        throw new Error("Feed has no items");
      }
      
      feedTitle = feed.title;
      latestItemTitle = feed.items[0]?.title || null;
      latestItemUrl = (feed.items[0]?.link as string) || null;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid RSS feed" },
        { status: 400 }
      );
    }

    // Create the feed subscription
    const feed = await prisma.feed.create({
      data: {
        userId: user.id,
        feedUrl: parsed.data.feedUrl,
        name: parsed.data.name || feedTitle || "Untitled Feed",
        siteUrl: parsed.data.siteUrl || null,
        faviconUrl: parsed.data.faviconUrl || null,
        latestItemTitle,
        latestItemUrl,
        lastFetchedAt: new Date(),
      },
    });

    return NextResponse.json({ feed });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
