import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl, getDomainFromUrl } from "@/lib/url";
import { embedConfigToQuery, embedHeight, mergeEmbedConfig } from "@/lib/embed";
import { formatRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio-player";
import { GenerateButton } from "@/components/generate-button";
import { EmbedButton } from "@/components/embed-button";

export const dynamic = "force-dynamic";

export default async function SiteOverviewPage({
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

  const latestEpisode = await prisma.episode.findFirst({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
  });

  const publishedEpisode = await prisma.episode.findFirst({
    where: { siteId: site.id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  const playbackPlays = await prisma.playbackEvent.count({
    where: { episode: { siteId: site.id }, kind: "play" },
  });
  const playbackCompletions = await prisma.playbackEvent.count({
    where: { episode: { siteId: site.id }, kind: "progress", value: 100 },
  });

  const primarySource = site.sources[0] || null;
  const baseUrl = getBaseUrl();
  const config = mergeEmbedConfig(site.embedConfig);
  const embedHeightPx = embedHeight(config);
  const embedQuery = embedConfigToQuery(config);
  const embedUrl = publishedEpisode
    ? `${baseUrl}/embed/e/${publishedEpisode.publicId}?${embedQuery}`
    : null;

  const isNewWorkspace = site.sources.length === 0 && !latestEpisode;
  const styleLabel = config.size === "compact" ? "Compact" : config.size === "tall" ? "Tall" : "Standard";
  const latestStatusLabel = latestEpisode?.status === "CANCELLED" ? "Canceled" : latestEpisode?.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">{site.name}</h2>
          <p className="text-sm text-zinc-500">
            {site.sources.length} source{site.sources.length === 1 ? "" : "s"} · Auto: Off · Style: {styleLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {primarySource ? (
            <GenerateButton
              siteId={site.id}
              sourceId={primarySource.id}
              label="Generate latest"
              size="lg"
            />
          ) : (
            <Button asChild variant="outline" size="lg">
              <Link href={`/app/sites/${site.id}/sources`}>Add a source</Link>
            </Button>
          )}
          <EmbedButton
            label="Copy embed"
            size="lg"
            publicId={publishedEpisode?.publicId || null}
            baseUrl={baseUrl}
            config={config}
          />
        </div>
      </div>

      {isNewWorkspace ? (
        <Card>
          <CardHeader>
            <CardTitle>Get started in 3 steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs text-white">1</span>
              Add a source (RSS or website).
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs text-white">2</span>
              Choose a style preset in the Style tab.
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs text-white">3</span>
              Copy the embed snippet and publish it.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Latest episode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestEpisode ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-zinc-900">
                        {latestEpisode.title}
                      </div>
                      <Badge variant={latestEpisode.status === "PUBLISHED" ? "default" : "secondary"}>
                        {latestStatusLabel}
                      </Badge>
                      <span className="text-xs text-zinc-400">
                        {formatRelativeTime(latestEpisode.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      Source: {getDomainFromUrl(latestEpisode.sourceUrl)}
                    </div>
                    {latestEpisode.status === "PUBLISHED" ? (
                      <AudioPlayer publicId={latestEpisode.publicId} />
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Audio will appear once the episode is published.
                      </p>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/app/episodes/${latestEpisode.id}`}>Open episode</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">No episodes yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {embedUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-200 bg-white">
                      <iframe
                        title="Embed preview"
                        src={embedUrl}
                        style={{ height: embedHeightPx }}
                        className="w-full"
                        loading="lazy"
                      />
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/app/embed?siteId=${site.id}`}>Open preview page</Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Publish an episode to preview the embed.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="space-y-2 py-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sources</div>
                <div className="text-2xl font-semibold text-zinc-900">{site.sources.length}</div>
                <div className="text-sm text-zinc-500">
                  {primarySource
                    ? `Primary: ${getDomainFromUrl(primarySource.url)}`
                    : "Add your first source"}
                </div>
                <Button asChild variant="ghost" size="sm" className="px-0 text-zinc-600">
                  <Link href={`/app/sites/${site.id}/sources`}>View sources →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 py-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Style</div>
                <div className="text-2xl font-semibold text-zinc-900">{styleLabel}</div>
                <div className="text-sm text-zinc-500">
                  Theme: {config.theme} · Radius: {config.radius}
                </div>
                <Button asChild variant="ghost" size="sm" className="px-0 text-zinc-600">
                  <Link href={`/app/sites/${site.id}/style`}>Edit style →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 py-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Analytics</div>
                <div className="text-2xl font-semibold text-zinc-900">{playbackPlays}</div>
                <div className="text-sm text-zinc-500">{playbackCompletions} completions</div>
                <Button asChild variant="ghost" size="sm" className="px-0 text-zinc-600">
                  <Link href="/app/analytics">View analytics →</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
