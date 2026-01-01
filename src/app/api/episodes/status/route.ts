import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where = {
    status: { in: ["QUEUED", "RUNNING"] as const },
    site: { userId: user.id },
  };

  const [activeCount, activeEpisodes] = await Promise.all([
    prisma.episode.count({ where }),
    prisma.episode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        site: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    activeCount,
    activeEpisodes: activeEpisodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      status: episode.status,
      createdAt: episode.createdAt,
      siteName: episode.site.name,
    })),
  });
}
