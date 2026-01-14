import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  episodeId: z.string().min(1).optional(),
  feedId: z.string().min(1).optional(),
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

  // Cancel a specific episode
  if (parsed.data.episodeId) {
    const episode = await prisma.episode.findFirst({
      where: { id: parsed.data.episodeId, userId: user.id },
    });
    if (!episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    if (episode.status !== "QUEUED" && episode.status !== "RUNNING") {
      return NextResponse.json({ ok: true, cancelled: 0 });
    }

    await prisma.episode.update({
      where: { id: episode.id },
      data: { status: "CANCELLED", errorMessage: "Cancelled by user" },
    });

    return NextResponse.json({ ok: true, cancelled: 1 });
  }

  // Cancel all episodes for a feed
  if (parsed.data.feedId) {
    const feed = await prisma.feed.findFirst({
      where: { id: parsed.data.feedId, userId: user.id },
    });
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const result = await prisma.episode.updateMany({
      where: {
        feedId: feed.id,
        status: { in: ["QUEUED", "RUNNING"] },
      },
      data: { status: "CANCELLED", errorMessage: "Cancelled by user" },
    });

    return NextResponse.json({ ok: true, cancelled: result.count });
  }

  // Cancel all user's episodes
  const result = await prisma.episode.updateMany({
    where: {
      userId: user.id,
      status: { in: ["QUEUED", "RUNNING"] },
    },
    data: { status: "CANCELLED", errorMessage: "Cancelled by user" },
  });

  return NextResponse.json({ ok: true, cancelled: result.count });
}
