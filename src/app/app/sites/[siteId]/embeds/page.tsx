import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
import { embedConfigToQuery, embedHeight, mergeEmbedConfig } from "@/lib/embed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/components/copy-field";

export const dynamic = "force-dynamic";

export default async function EmbedsPage({
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

  const episode = await prisma.episode.findFirst({
    where: { siteId: site.id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  if (!episode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Embeds</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-500">
          Publish an episode to unlock embed snippets.
        </CardContent>
      </Card>
    );
  }

  const baseUrl = getBaseUrl();
  const config = mergeEmbedConfig(site.embedConfig);
  const embedHeightPx = embedHeight(config);
  const query = embedConfigToQuery(config);
  const playerUrl = `${baseUrl}/listen/e/${episode.publicId}`;
  const embedUrl = `${baseUrl}/embed/e/${episode.publicId}?${query}`;
  const iframeSnippet = `<iframe src=\"${embedUrl}\" style=\"width:100%;height:${embedHeightPx}px;border:0\" loading=\"lazy\"></iframe>`;
  const widgetSnippet = `<script async src=\"${baseUrl}/widget.js\" data-episode=\"${episode.publicId}\" data-theme=\"${config.theme}\" data-accent=\"${config.accentColor}\" data-radius=\"${config.radius}\" data-size=\"${config.size}\" data-chapters=\"${config.showChapters ? "1" : "0"}\" data-transcript=\"${config.showTranscript ? "1" : "0"}\" data-open=\"${config.showOpenPlayer ? "1" : "0"}\"></script>`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Embed snippets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CopyField label="Hosted player URL" value={playerUrl} />
          <CopyField label="Iframe snippet" value={iframeSnippet} mono />
          <CopyField label="Widget.js snippet" value={widgetSnippet} mono />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-zinc-200 bg-white">
            <iframe title="Embed preview" src={embedUrl} style={{ height: embedHeightPx }} className="w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
