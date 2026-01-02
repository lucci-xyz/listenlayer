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

  const isNewPublication = site.sources.length === 0 && !latestEpisode;
  const styleLabel = config.size === "compact" ? "Compact" : config.size === "tall" ? "Tall" : "Standard";
  const latestStatusLabel = latestEpisode?.status === "CANCELLED" ? "Canceled" : latestEpisode?.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{site.name}</h2>
          <p className="text-[13px] text-muted-foreground">
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

      {isNewPublication ? (
        <Card>
          <CardHeader>
            <CardTitle>Get started in 3 steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">1</span>
              Add a source (RSS or website).
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">2</span>
              Choose a style preset in the Style tab.
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">3</span>
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
                      <div className="text-[13px] font-semibold text-foreground">
                        {latestEpisode.title}
                      </div>
                      <Badge variant={latestEpisode.status === "PUBLISHED" ? "default" : "secondary"}>
                        {latestStatusLabel}
                      </Badge>
                      <span className="text-[12px] text-muted-foreground">
                        {formatRelativeTime(latestEpisode.createdAt)}
                      </span>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      Source: {getDomainFromUrl(latestEpisode.sourceUrl)}
                    </div>
                    {latestEpisode.status === "PUBLISHED" ? (
                      <AudioPlayer publicId={latestEpisode.publicId} />
                    ) : (
                      <p className="text-[13px] text-muted-foreground">
                        Audio will appear once the episode is published.
                      </p>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/app/episodes/${latestEpisode.id}`}>Open episode</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-[13px] text-muted-foreground">No episodes yet.</p>
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
                    <div className="rounded-xl border border-border bg-white">
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
                  <p className="text-[13px] text-muted-foreground">
                    Publish an episode to preview the embed.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="space-y-2 py-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Sources</div>
                <div className="text-2xl font-semibold text-foreground">{site.sources.length}</div>
                <div className="text-[13px] text-muted-foreground">
                  {primarySource
                    ? `Primary: ${getDomainFromUrl(primarySource.url)}`
                    : "Add your first source"}
                </div>
                <Button asChild variant="ghost" size="sm" className="px-0 text-muted-foreground">
                  <Link href={`/app/sites/${site.id}/sources`}>View sources →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 py-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Style</div>
                <div className="text-2xl font-semibold text-foreground">{styleLabel}</div>
                <div className="text-[13px] text-muted-foreground">
                  Theme: {config.theme} · Radius: {config.radius}
                </div>
                <Button asChild variant="ghost" size="sm" className="px-0 text-muted-foreground">
                  <Link href={`/app/sites/${site.id}/style`}>Edit style →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 py-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Analytics</div>
                <div className="text-2xl font-semibold text-foreground">{playbackPlays}</div>
                <div className="text-[13px] text-muted-foreground">{playbackCompletions} completions</div>
                <Button asChild variant="ghost" size="sm" className="px-0 text-muted-foreground">
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
