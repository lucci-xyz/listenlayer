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

const INSUFFICIENT_CREDITS_ERROR = "INSUFFICIENT_CREDITS";

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

    const requestedCount = parsed.data.count ?? 1;

    if (requestedCount > 1 && source.type !== "RSS") {
      return NextResponse.json(
        { error: "Backfill is only available for RSS sources." },
        { status: 400 }
      );
    }

    const parser = new Parser();
    const episodeIds: string[] = [];
    type EpisodeSeed = { title: string; canonicalUrl: string };
    let seeds: EpisodeSeed[] = [];

    if (requestedCount > 1 && source.type === "RSS") {
      const feed = await parser.parseURL(source.url);
      const items = (feed.items || []).filter((item) => item?.link);
      const selected = items.slice(0, requestedCount);
      seeds = selected.map((item) => ({
        title: item.title || feed.title || "Episode",
        canonicalUrl: item.link as string,
      }));
    } else {
      seeds = [
        {
          title: "Pending episode",
          canonicalUrl: source.url,
        },
      ];
    }

    if (seeds.length === 0) {
      return NextResponse.json(
        { error: "No items found to generate from this source" },
        { status: 400 }
      );
    }

    const episodesToCreate = seeds.map((seed) => ({
      siteId: site.id,
      sourceId: source.id,
      title: seed.title || "Pending episode",
      sourceUrl: seed.canonicalUrl,
      status: "QUEUED" as const,
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

      for (const [index, episode] of createdEpisodes.entries()) {
        episodeIds.push(episode.id);
        const seed = seeds[index];
        await inngest.send({
          name: "episode/generate.requested",
          data: {
            userId: user.id,
            siteId: site.id,
            sourceId: source.id,
            episodeId: episode.id,
            canonicalUrl: seed.canonicalUrl,
            episodeTitle: seed.title,
            format: parsed.data.format,
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
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
