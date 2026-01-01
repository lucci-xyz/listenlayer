import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
import EpisodesClient, { EpisodeListItem } from "@/app/app/episodes/episodes-client";

export const dynamic = "force-dynamic";

export default async function EpisodesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const episodes = await prisma.episode.findMany({
    where: { site: { userId: user.id } },
    include: { site: true },
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
    siteName: episode.site.name,
    siteId: episode.siteId,
    embedConfig: episode.site.embedConfig || null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Episodes</h1>
        <p className="text-sm text-zinc-500">All episodes across your workspaces.</p>
      </div>
      <EpisodesClient episodes={items} baseUrl={baseUrl} showSite />
    </div>
  );
}
