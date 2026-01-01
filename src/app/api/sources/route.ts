import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Parser from "rss-parser";
import { validateReadableUrl } from "@/lib/source-validation";

const schema = z.object({
  siteId: z.string().min(1),
  type: z.enum(["RSS", "URL"]),
  url: z.string().url(),
  displayName: z.string().min(1).optional(),
  faviconUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const site = await prisma.site.findFirst({
    where: { id: parsed.data.siteId, userId: user.id },
  });
  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  let latestItemTitle: string | null = null;
  let latestItemUrl: string | null = null;
  let displayName = parsed.data.displayName;

  try {
    if (parsed.data.type === "RSS") {
      const parser = new Parser();
      const response = await fetch(parsed.data.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS: ${response.status}`);
      }
      const xml = await response.text();
      const feed = await parser.parseString(xml);
      if (!feed.items || feed.items.length === 0) {
        throw new Error("RSS feed has no items");
      }
      latestItemTitle = feed.items[0]?.title || null;
      latestItemUrl = (feed.items[0]?.link as string) || null;
      displayName = displayName || feed.title || undefined;
    } else {
      await validateReadableUrl(parsed.data.url);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Source validation failed" },
      { status: 400 }
    );
  }

  const source = await prisma.source.create({
    data: {
      siteId: site.id,
      type: parsed.data.type,
      url: parsed.data.url,
      displayName,
      faviconUrl: parsed.data.faviconUrl,
      latestItemTitle,
      latestItemUrl,
      lastFetchStatus: "success",
      lastError: null,
      lastFetchedAt: new Date(),
    },
  });

  return NextResponse.json({ source });
}
