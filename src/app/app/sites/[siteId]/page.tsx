import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl, getDomainFromUrl } from "@/lib/url";
import { formatRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const isNewPublication = site.sources.length === 0 && !publishedEpisode;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{site.name}</h2>
          <p className="text-xs text-muted-foreground">
            {site.sources.length} source{site.sources.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {primarySource ? (
            <GenerateButton
              siteId={site.id}
              sourceId={primarySource.id}
              label="Generate latest"
            />
          ) : (
            <Button asChild variant="outline">
              <Link href={`/app/sites/${site.id}/sources`}>Add a source</Link>
            </Button>
          )}
          <EmbedButton
            label="Copy embed"
            publicId={publishedEpisode?.publicId || null}
            baseUrl={baseUrl}
          />
        </div>
      </div>

      {isNewPublication ? (
        <Card>
          <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
            <p>Add a source (RSS or website).</p>
            <p>Copy the embed snippet and publish it.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Latest published episode player */}
          {publishedEpisode ? (
            <Card>
              <CardContent className="space-y-3 py-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {publishedEpisode.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getDomainFromUrl(publishedEpisode.sourceUrl)} · {formatRelativeTime(publishedEpisode.createdAt)}
                    </div>
                  </div>
                  <Link
                    href={`/listen/e/${publishedEpisode.publicId}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Open player →
                  </Link>
                </div>
                <AudioPlayer publicId={publishedEpisode.publicId} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-5">
                <p className="text-sm text-muted-foreground">No published episodes yet.</p>
              </CardContent>
            </Card>
          )}

          {/* Summary blocks */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="space-y-1 py-5">
                <div className="text-xs text-muted-foreground">Sources</div>
                <div className="text-2xl font-semibold">{site.sources.length}</div>
                <Link
                  href={`/app/sites/${site.id}/sources`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  View sources →
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-1 py-5">
                <div className="text-xs text-muted-foreground">Analytics</div>
                <div className="text-2xl font-semibold">{playbackPlays} <span className="text-sm font-normal text-muted-foreground">plays</span></div>
                <div className="text-xs text-muted-foreground">{playbackCompletions} completions</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
