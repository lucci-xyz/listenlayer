import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardClient from "@/app/app/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const sites = await prisma.site.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const siteIds = sites.map((site) => site.id);
  const sources = siteIds.length
    ? await prisma.source.findMany({
        where: { siteId: { in: siteIds } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const episodes = siteIds.length
    ? await prisma.episode.findMany({
        where: { siteId: { in: siteIds } },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const playbackCounts = episodes.length
    ? await prisma.playbackEvent.groupBy({
        by: ["episodeId", "kind", "value"],
        _count: { _all: true },
      })
    : [];

  const stats: Record<
    string,
    { plays: number; progress: Record<number, number> }
  > = {};
  for (const row of playbackCounts) {
    if (!stats[row.episodeId]) {
      stats[row.episodeId] = { plays: 0, progress: {} };
    }
    if (row.kind === "play") {
      stats[row.episodeId].plays += row._count._all;
    }
    if (row.kind === "progress" && row.value !== null) {
      stats[row.episodeId].progress[row.value] =
        (stats[row.episodeId].progress[row.value] || 0) + row._count._all;
    }
  }

  return (
    <DashboardClient
      sites={sites.map((site) => ({
        id: site.id,
        name: site.name,
        domain: site.domain,
      }))}
      sources={sources.map((source) => ({
        id: source.id,
        siteId: source.siteId,
        type: source.type,
        url: source.url,
        lastFetchedAt: source.lastFetchedAt?.toISOString() || null,
      }))}
      episodes={episodes.map((episode) => ({
        id: episode.id,
        siteId: episode.siteId,
        sourceId: episode.sourceId,
        title: episode.title,
        status: episode.status,
        publicId: episode.publicId,
        createdAt: episode.createdAt.toISOString(),
      }))}
      stats={stats}
    />
  );
}
