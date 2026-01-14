import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl, getDomainFromUrl } from "@/lib/url";
import EpisodesClient, { EpisodeListItem } from "@/app/app/episodes/episodes-client";

export const dynamic = "force-dynamic";

export default async function EpisodesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const episodes = await prisma.episode.findMany({
    where: { userId: user.id },
    include: { feed: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const baseUrl = getBaseUrl();
  const items: EpisodeListItem[] = episodes.map((episode) => ({
    id: episode.id,
    title: episode.title,
    status: episode.status,
    createdAt: episode.createdAt.toISOString(),
    sourceUrl: episode.sourceUrl,
    publicId: episode.publicId,
    feedName: episode.feed?.name || null,
    feedId: episode.feedId,
    sourceDomain: getDomainFromUrl(episode.sourceUrl),
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl tracking-tight">Episodes</h1>
      <EpisodesClient episodes={items} baseUrl={baseUrl} />
    </div>
  );
}
