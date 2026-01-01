import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SourcesClient from "@/app/app/sites/[siteId]/sources/sources-client";

export const dynamic = "force-dynamic";

export default async function SourcesPage({
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
    include: { sources: { orderBy: { createdAt: "asc" } } },
  });

  if (!site) {
    redirect("/app");
  }

  return (
    <SourcesClient
      siteId={site.id}
      sources={site.sources.map((source) => ({
        id: source.id,
        type: source.type,
        url: source.url,
        displayName: source.displayName,
        faviconUrl: source.faviconUrl,
        latestItemTitle: source.latestItemTitle,
        latestItemUrl: source.latestItemUrl,
        lastFetchStatus: source.lastFetchStatus,
        lastError: source.lastError,
        lastFetchedAt: source.lastFetchedAt?.toISOString() || null,
      }))}
    />
  );
}
