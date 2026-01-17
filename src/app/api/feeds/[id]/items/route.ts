import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Parser from "rss-parser";
import { fetchWithTimeout, feedHeaders } from "@/lib/fetch";
import { sanitizeErrorMessage } from "@/lib/errors";
import { stripHtml } from "@/lib/html";

// Fetch latest items from a feed subscription
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const feed = await prisma.feed.findFirst({
      where: { id, userId: user.id },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Fetch the RSS feed
    const parser = new Parser();
    const response = await fetchWithTimeout(feed.feedUrl, {
      redirect: "follow",
      timeoutMs: 12000,
      headers: feedHeaders,
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch feed: ${response.status}` },
        { status: 502 }
      );
    }

    const xml = await response.text();
    const feedData = await parser.parseString(xml);

    // Get URLs from the feed items we'll display (limit to 20)
    const feedItemUrls = (feedData.items || [])
      .slice(0, 20)
      .map(item => item.link)
      .filter((url): url is string => Boolean(url));

    // Only query episodes matching URLs we'll actually display (optimized query)
    const existingEpisodes = feedItemUrls.length > 0
      ? await prisma.episode.findMany({
          where: { 
            feedId: feed.id,
            sourceUrl: { in: feedItemUrls }, // Only episodes matching displayed items
          },
          select: { sourceUrl: true, status: true, title: true },
        })
      : [];

    const statusPriority: Record<string, number> = {
      PUBLISHED: 4,
      RUNNING: 3,
      QUEUED: 2,
      FAILED: 1,
    };
    const statusByKey = new Map<string, string>();
    const statusByUrl = new Map<string, { status: string; count: number }>();

    for (const episode of existingEpisodes) {
      const key = `${episode.sourceUrl}::${episode.title}`;
      const currentKeyStatus = statusByKey.get(key);
      if (
        !currentKeyStatus ||
        (statusPriority[episode.status] || 0) > (statusPriority[currentKeyStatus] || 0)
      ) {
        statusByKey.set(key, episode.status);
      }

      const existing = statusByUrl.get(episode.sourceUrl);
      if (existing) {
        const bestStatus =
          (statusPriority[episode.status] || 0) > (statusPriority[existing.status] || 0)
            ? episode.status
            : existing.status;
        statusByUrl.set(episode.sourceUrl, {
          status: bestStatus,
          count: existing.count + 1,
        });
      } else {
        statusByUrl.set(episode.sourceUrl, { status: episode.status, count: 1 });
      }
    }

    // Map feed items with generation status
    const items = (feedData.items || []).slice(0, 20).map((item, index) => {
      const url = item.link || "";
      const pubDate = item.pubDate || item.isoDate || null;
      const baseKey =
        (typeof item.guid === "string" && item.guid) ||
        (typeof item.link === "string" && item.link) ||
        "item";
      const id = `${baseKey}-${pubDate ?? "no-date"}-${index}`;
      const title = item.title || "Untitled";
      const rawContent = item.content || item.contentSnippet || "";
      const contentText = rawContent ? stripHtml(rawContent).slice(0, 8000) : null;
      const statusKey = `${url}::${title}`;
      const statusByTitle = statusByKey.get(statusKey) || null;
      const urlStatus = statusByUrl.get(url);
      const status =
        statusByTitle || (urlStatus && urlStatus.count === 1 ? urlStatus.status : null);

      return {
        id,
        title,
        url,
        pubDate,
        description: item.contentSnippet?.slice(0, 200) || item.content?.slice(0, 200) || null,
        contentText,
        status, // null = not generated, or QUEUED/RUNNING/PUBLISHED/FAILED
      };
    });

    // Update feed metadata
    await prisma.feed.update({
      where: { id: feed.id },
      data: {
        lastFetchedAt: new Date(),
        latestItemTitle: items[0]?.title || null,
        latestItemUrl: items[0]?.url || null,
        lastError: null,
      },
    });

    return NextResponse.json({
      feed: {
        id: feed.id,
        name: feed.name,
        feedUrl: feed.feedUrl,
      },
      feedTitle: feedData.title,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}
