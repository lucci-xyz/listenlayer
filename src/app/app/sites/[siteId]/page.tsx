import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
import { embedConfigToQuery, embedHeight, mergeEmbedConfig } from "@/lib/embed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio-player";
import { GenerateButton } from "@/components/generate-button";
import { CopyField } from "@/components/copy-field";

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

  const primarySource = site.sources[0] || null;
  const baseUrl = getBaseUrl();
  const config = mergeEmbedConfig(site.embedConfig);
  const embedHeightPx = embedHeight(config);
  const embedQuery = embedConfigToQuery(config);
  const embedUrl = publishedEpisode
    ? `${baseUrl}/embed/e/${publishedEpisode.publicId}?${embedQuery}`
    : null;
  const iframeSnippet = embedUrl
    ? `<iframe src=\"${embedUrl}\" style=\"width:100%;height:${embedHeightPx}px;border:0\" loading=\"lazy\"></iframe>`
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-400">Quick actions</div>
            <div className="text-lg font-semibold text-zinc-900">Generate your next episode</div>
            <p className="text-sm text-zinc-500">Runs the latest source and publishes new audio.</p>
          </div>
          {primarySource ? (
            <GenerateButton
              siteId={site.id}
              sourceId={primarySource.id}
              label="Generate latest"
              size="lg"
            />
          ) : (
            <Button asChild variant="outline">
              <Link href={`/app/sites/${site.id}/sources`}>Add a source</Link>
            </Button>
          )}
        </CardContent>
      </Card>

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
                    {latestEpisode.status}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-500">{latestEpisode.sourceUrl}</div>
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
                  <iframe title="Embed preview" src={embedUrl} style={{ height: embedHeightPx }} className="w-full" />
                </div>
                {iframeSnippet ? (
                  <CopyField label="Embed snippet" value={iframeSnippet} mono />
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/sites/${site.id}/embeds`}>Edit embed styles</Link>
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
    </div>
  );
}
