import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Parser from "rss-parser";

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
    const response = await fetch(feed.feedUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch feed: ${response.status}` },
        { status: 502 }
      );
    }

    const xml = await response.text();
    const feedData = await parser.parseString(xml);

    // Get existing episodes for this feed to mark which items are already generated
    const existingEpisodes = await prisma.episode.findMany({
      where: { feedId: feed.id },
      select: { sourceUrl: true, status: true },
    });

    const existingUrls = new Map(
      existingEpisodes.map((ep) => [ep.sourceUrl, ep.status])
    );

    // Map feed items with generation status
    const items = (feedData.items || []).slice(0, 20).map((item) => {
      const url = item.link || "";
      return {
        title: item.title || "Untitled",
        url,
        pubDate: item.pubDate || item.isoDate || null,
        description: item.contentSnippet?.slice(0, 200) || item.content?.slice(0, 200) || null,
        status: existingUrls.get(url) || null, // null = not generated, or QUEUED/RUNNING/PUBLISHED/FAILED
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
      { error: error instanceof Error ? error.message : "Failed to fetch feed" },
      { status: 500 }
    );
  }
}
