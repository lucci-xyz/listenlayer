import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl, getDomainFromUrl } from "@/lib/url";
import { embedConfigToQuery, embedHeight, mergeEmbedConfig } from "@/lib/embed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    where: { id, site: { userId: user.id } },
    include: { site: true, source: true },
  });

  if (!episode) {
    redirect("/app");
  }

  const chapters = (Array.isArray(episode.chaptersJson)
    ? episode.chaptersJson
    : []) as { title: string; startApproxSec: number }[];
  const baseUrl = getBaseUrl();
  const config = mergeEmbedConfig(episode.site.embedConfig);
  const embedHeightPx = embedHeight(config);
  const embedQuery = embedConfigToQuery(config);
  const playerUrl = `${baseUrl}/listen/e/${episode.publicId}`;
  const embedUrl = `${baseUrl}/embed/e/${episode.publicId}?${embedQuery}`;
  const iframeSnippet = `<iframe src=\"${embedUrl}\" style=\"width:100%;height:${embedHeightPx}px;border:0\" loading=\"lazy\"></iframe>`;
  const widgetSnippet = `<script async src=\"${baseUrl}/widget.js\" data-episode=\"${episode.publicId}\" data-theme=\"${config.theme}\" data-accent=\"${config.accentColor}\" data-radius=\"${config.radius}\" data-size=\"${config.size}\" data-chapters=\"${config.showChapters ? "1" : "0"}\" data-transcript=\"${config.showTranscript ? "1" : "0"}\" data-open=\"${config.showOpenPlayer ? "1" : "0"}\"></script>`;
  const statusLabel = episode.status === "CANCELLED" ? "Canceled" : episode.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="text-[12px] text-muted-foreground">{episode.site.name}</div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{episode.title}</h1>
            <Badge variant={episode.status === "PUBLISHED" ? "default" : "secondary"}>
              {statusLabel}
            </Badge>
          </div>
          <div className="text-[13px] text-muted-foreground">
            Source: {getDomainFromUrl(episode.sourceUrl)}
          </div>
        </div>
        <EmbedButton
          publicId={episode.status === "PUBLISHED" ? episode.publicId : null}
          baseUrl={baseUrl}
          config={config}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audio</CardTitle>
        </CardHeader>
        <CardContent>
          {episode.status === "CANCELLED" ? (
            <div className="mb-3 text-[13px] text-amber-700">
              Generation was cancelled.
            </div>
          ) : null}
          {episode.errorMessage && episode.status !== "CANCELLED" ? (
            <div className="mb-3 text-[13px] text-red-600">
              Generation failed: {episode.errorMessage}
            </div>
          ) : null}
          {episode.status === "PUBLISHED" ? (
            <AudioPlayer publicId={episode.publicId} />
          ) : (
            <div className="text-[13px] text-muted-foreground">
              Audio will be available once the episode is published.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-[13px] text-foreground">
          {episode.transcriptText || "Transcript will appear after publishing."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          {chapters.length === 0 ? (
            <div className="text-[13px] text-muted-foreground">No chapters yet.</div>
          ) : (
            <ul className="space-y-2 text-[13px] text-muted-foreground">
              {chapters.map((chapter, index) => (
                <li key={`${chapter.title}-${index}`}>
                  <span className="font-semibold text-foreground">{chapter.title}</span>
                  <span className="ml-2 text-[12px] text-muted-foreground">
                    ~{chapter.startApproxSec}s
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-[13px]">
          <CopyField label="Player URL" value={playerUrl} />
          <CopyField label="Iframe snippet" value={iframeSnippet} mono />
          <CopyField label="Widget.js snippet" value={widgetSnippet} mono />
        </CardContent>
      </Card>
    </div>
  );
}
