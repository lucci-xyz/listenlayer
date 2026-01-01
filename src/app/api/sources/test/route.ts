import { NextResponse } from "next/server";
import { z } from "zod";
import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { validateReadableUrl } from "@/lib/source-validation";

const schema = z.object({
  sourceId: z.string().min(1),
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

  const source = await prisma.source.findFirst({
    where: { id: parsed.data.sourceId, site: { userId: user.id } },
  });
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (source.type === "RSS") {
      const parser = new Parser();
      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS: ${response.status}`);
      }
      const xml = await response.text();
      const feed = await parser.parseString(xml);
      const item = feed.items?.[0];

      await prisma.source.update({
        where: { id: source.id },
        data: {
          latestItemTitle: item?.title || source.latestItemTitle,
          latestItemUrl: item?.link || source.latestItemUrl,
          displayName: feed.title || source.displayName,
          lastFetchStatus: "success",
          lastError: null,
          lastFetchedAt: new Date(),
        },
      });
    } else {
      await validateReadableUrl(source.url);
      await prisma.source.update({
        where: { id: source.id },
        data: {
          lastFetchStatus: "success",
          lastError: null,
          lastFetchedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastFetchStatus: "fail",
        lastError: error instanceof Error ? error.message : "Fetch failed",
      },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fetch failed" },
      { status: 400 }
    );
  }
}
