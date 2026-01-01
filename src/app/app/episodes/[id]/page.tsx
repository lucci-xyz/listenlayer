import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio-player";

function getBaseUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

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
  const playerUrl = `${baseUrl}/listen/e/${episode.publicId}`;
  const embedUrl = `${baseUrl}/embed/e/${episode.publicId}`;
  const iframeSnippet = `<iframe src=\"${embedUrl}\" style=\"width:100%;height:160px;border:0\" loading=\"lazy\"></iframe>`;
  const widgetSnippet = `<script async src=\"${baseUrl}/widget.js\" data-episode=\"${episode.publicId}\"></script>`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="text-sm text-zinc-500">{episode.site.name}</div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{episode.title}</h1>
          <Badge variant={episode.status === "PUBLISHED" ? "default" : "secondary"}>
            {episode.status}
          </Badge>
        </div>
        <div className="text-sm text-zinc-500">Source: {episode.sourceUrl}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audio</CardTitle>
        </CardHeader>
        <CardContent>
          {episode.errorMessage ? (
            <div className="mb-3 text-sm text-red-600">
              Generation failed: {episode.errorMessage}
            </div>
          ) : null}
          <AudioPlayer publicId={episode.publicId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm text-zinc-700">
          {episode.transcriptText || "Transcript will appear after publishing."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          {chapters.length === 0 ? (
            <div className="text-sm text-zinc-500">No chapters yet.</div>
          ) : (
            <ul className="space-y-2 text-sm text-zinc-600">
              {chapters.map((chapter, index) => (
                <li key={`${chapter.title}-${index}`}>
                  <span className="font-semibold text-zinc-800">{chapter.title}</span>
                  <span className="ml-2 text-xs text-zinc-400">~{chapter.startApproxSec}s</span>
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
        <CardContent className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-400">Hosted Player URL</div>
            <div className="rounded-md bg-zinc-100 p-3 text-xs">{playerUrl}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-400">Iframe snippet</div>
            <div className="rounded-md bg-zinc-100 p-3 font-mono text-xs">{iframeSnippet}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-zinc-400">Widget.js snippet</div>
            <div className="rounded-md bg-zinc-100 p-3 font-mono text-xs">{widgetSnippet}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
