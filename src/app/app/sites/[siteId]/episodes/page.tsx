import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
import EpisodesClient, { EpisodeListItem } from "@/app/app/episodes/episodes-client";

export const dynamic = "force-dynamic";

export default async function SiteEpisodesPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: user.id },
  });

  if (!site) {
    redirect("/app");
  }

  const episodes = await prisma.episode.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const baseUrl = getBaseUrl();
  const items: EpisodeListItem[] = episodes.map((episode) => ({
    id: episode.id,
    title: episode.title,
    status: episode.status,
    createdAt: episode.createdAt.toISOString(),
    sourceUrl: episode.sourceUrl,
    publicId: episode.publicId,
    siteName: site.name,
    siteId: site.id,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Episodes</h2>
        <p className="text-[13px] text-muted-foreground">
          Your episode library for this show.
        </p>
      </div>

      <EpisodesClient episodes={items} baseUrl={baseUrl} />
    </div>
  );
}
