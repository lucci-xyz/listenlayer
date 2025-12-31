import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { inngest } from "@/lib/inngest";
import { randomBytes } from "node:crypto";

const schema = z.object({
  siteId: z.string().min(1),
  sourceId: z.string().min(1),
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

    await inngest.send({
      name: "episode/generate.requested",
      data: {
        userId: user.id,
        siteId: site.id,
        sourceId: source.id,
        episodeId: episode.id,
      },
    });

    return NextResponse.json({ episodeId: episode.id });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
