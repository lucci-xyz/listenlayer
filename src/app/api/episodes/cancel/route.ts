import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  siteId: z.string().min(1).optional(),
  episodeId: z.string().min(1).optional(),
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

  if (parsed.data.episodeId) {
    const episode = await prisma.episode.findFirst({
      where: { id: parsed.data.episodeId, site: { userId: user.id } },
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

  if (parsed.data.siteId) {
    const site = await prisma.site.findFirst({
      where: { id: parsed.data.siteId, userId: user.id },
    });
    if (!site) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
    }
  }

  const where: { siteId?: string; site?: { userId: string }; status: { in: ("QUEUED" | "RUNNING")[] } } = {
    status: { in: ["QUEUED", "RUNNING"] },
  };
  if (parsed.data.siteId) {
    where.siteId = parsed.data.siteId;
  } else {
    where.site = { userId: user.id };
  }

  const result = await prisma.episode.updateMany({
    where,
    data: { status: "CANCELLED", errorMessage: "Cancelled by user" },
  });

  return NextResponse.json({ ok: true, cancelled: result.count });
}
