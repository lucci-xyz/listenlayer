import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { randomBytes } from "node:crypto";
import Parser from "rss-parser";

const schema = z.object({
  siteId: z.string().min(1),
  sourceId: z.string().min(1),
  format: z.enum(["narration", "two-host", "tldr"]).optional(),
  count: z.number().int().min(1).max(10).optional(),
});

function makePublicId() {
  return randomBytes(8).toString("hex");
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
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

    const source = await prisma.source.findFirst({
      where: { id: parsed.data.sourceId, siteId: site.id },
    });
    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const count = parsed.data.count ?? 1;

    if (count > 1 && source.type !== "RSS") {
      return NextResponse.json(
        { error: "Backfill is only available for RSS sources." },
        { status: 400 }
      );
    }

    const parser = new Parser();
    const episodeIds: string[] = [];

    if (count > 1 && source.type === "RSS") {
      const feed = await parser.parseURL(source.url);
      const items = (feed.items || []).filter((item) => item?.link);
      const selected = items.slice(0, count);

      for (const item of selected) {
        const title = item.title || feed.title || "Episode";
        const link = item.link as string;
        const episode = await prisma.episode.create({
          data: {
            siteId: site.id,
            sourceId: source.id,
            title: title || "Pending episode",
            sourceUrl: link,
            status: "QUEUED",
            scriptText: "",
            transcriptText: "",
            chaptersJson: [],
            errorMessage: null,
            publicId: makePublicId(),
          },
        });
        episodeIds.push(episode.id);

        await inngest.send({
          name: "episode/generate.requested",
          data: {
            userId: user.id,
            siteId: site.id,
            sourceId: source.id,
            episodeId: episode.id,
            canonicalUrl: link,
            episodeTitle: title,
            format: parsed.data.format,
          },
        });
      }
    } else {
      const episode = await prisma.episode.create({
        data: {
          siteId: site.id,
          sourceId: source.id,
          title: "Pending episode",
          sourceUrl: source.url,
          status: "QUEUED",
          scriptText: "",
          transcriptText: "",
          chaptersJson: [],
          errorMessage: null,
          publicId: makePublicId(),
        },
      });
      episodeIds.push(episode.id);

      await inngest.send({
        name: "episode/generate.requested",
        data: {
          userId: user.id,
          siteId: site.id,
          sourceId: source.id,
          episodeId: episode.id,
          format: parsed.data.format,
        },
      });
    }

    return NextResponse.json({ episodeId: episodeIds[0] || null, episodeIds });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
