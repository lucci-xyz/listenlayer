import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl, getDomainFromUrl } from "@/lib/url";
import { embedHeight } from "@/lib/embed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayer } from "@/components/audio-player";
import { CopyField } from "@/components/copy-field";
import { EmbedButton } from "@/components/embed-button";

export const dynamic = "force-dynamic";

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const episode = await prisma.episode.findFirst({
    where: { id, userId: user.id },
    include: { feed: true },
  });

  if (!episode) {
    redirect("/app");
  }

  const chapters = (Array.isArray(episode.chaptersJson) ? episode.chaptersJson : []) as {
    title: string;
    startApproxSec: number;
  }[];
  const baseUrl = getBaseUrl();
  const embedHeightPx = embedHeight();
  const embedUrl = `${baseUrl}/embed/e/${episode.publicId}`;
  const iframeSnippet = `<iframe src="${embedUrl}" style="width:100%;height:${embedHeightPx}px;border:0;background:transparent" loading="lazy" allow="autoplay"></iframe>`;
  const playerUrl = `${baseUrl}/listen/e/${episode.publicId}`;
  const statusLabel = episode.status === "CANCELLED" ? "Canceled" : episode.status;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/app/episodes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to episodes
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {episode.feed ? (
            <Link
              href={`/app/feeds/${episode.feed.id}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {episode.feed.name}
            </Link>
          ) : (
            <div className="text-xs text-muted-foreground">Standalone episode</div>
          )}
          <h1 className="font-display text-3xl text-foreground">{episode.title}</h1>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{statusLabel}</span>
            <a
              href={episode.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {getDomainFromUrl(episode.sourceUrl)}
            </a>
            {episode.status === "PUBLISHED" && (
              <Link
                href={`/listen/e/${episode.publicId}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Open player <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
        <EmbedButton publicId={episode.status === "PUBLISHED" ? episode.publicId : null} baseUrl={baseUrl} />
      </div>

      {/* Player */}
      <Card>
        <CardContent className="py-5">
          {episode.status === "CANCELLED" && (
            <p className="mb-3 text-sm text-warning-foreground">Generation was cancelled.</p>
          )}
          {episode.errorMessage && episode.status !== "CANCELLED" && (
            <p className="mb-3 text-sm text-destructive">Generation failed: {episode.errorMessage}</p>
          )}
          {episode.status === "PUBLISHED" ? (
            <AudioPlayer publicId={episode.publicId} />
          ) : episode.status === "QUEUED" || episode.status === "RUNNING" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-warning" />
              Generating audio...
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Audio will be available once the episode is published.</p>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transcript</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm text-foreground">
          {episode.transcriptText || "Transcript will appear after publishing."}
        </CardContent>
      </Card>

      {/* Chapters */}
      {chapters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chapters</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {chapters.map((chapter, idx) => (
                <li key={`${chapter.title}-${idx}`}>
                  <span className="font-medium text-foreground">{chapter.title}</span>
                  <span className="ml-2 text-xs">~{chapter.startApproxSec}s</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Embed */}
      {episode.status === "PUBLISHED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Embed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <CopyField label="Player URL" value={playerUrl} />
            <CopyField label="Iframe snippet" value={iframeSnippet} mono />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
