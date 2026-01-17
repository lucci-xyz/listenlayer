import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrlFromHeaders } from "@/lib/url";
import { embedHeight } from "@/lib/embed";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/copy-field";
import { EmbedButton } from "@/components/embed-button";

export const dynamic = "force-dynamic";

export default async function EmbedPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const publicIdParam = Array.isArray(params.publicId) ? params.publicId[0] : params.publicId;
  const feedIdParam = Array.isArray(params.feedId) ? params.feedId[0] : params.feedId;

  const baseUrl = getBaseUrlFromHeaders(await headers());
  const height = embedHeight();

  // Get the latest published episode
  let episode = null;

  if (publicIdParam) {
    episode = await prisma.episode.findFirst({
      where: { publicId: publicIdParam, userId: user.id },
    });
  } else if (feedIdParam) {
    episode = await prisma.episode.findFirst({
      where: { feedId: feedIdParam, userId: user.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
  } else {
    episode = await prisma.episode.findFirst({
      where: { userId: user.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!episode) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl text-foreground">Embed preview</h1>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Generate and publish an episode to preview the embed.
            </p>
            <Button asChild className="mt-4">
              <Link href="/app">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const embedUrl = `${baseUrl}/embed/e/${episode.publicId}`;
  const iframeSnippet = `<iframe src="${embedUrl}" style="width:100%;height:${height}px;border:0;background:transparent" loading="lazy" allow="autoplay"></iframe>`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Embed preview</h1>
          <p className="text-sm text-muted-foreground">{episode.title}</p>
        </div>
        <EmbedButton label="Copy embed" publicId={episode.publicId} baseUrl={baseUrl} />
      </div>

      {/* Live player preview */}
      <Card>
        <CardContent className="py-5">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <iframe
              title="Embed preview"
              src={embedUrl}
              style={{ height }}
              className="w-full"
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      {/* Copy snippet */}
      <Card>
        <CardContent className="py-5">
          <CopyField label="Iframe snippet" value={iframeSnippet} mono />
        </CardContent>
      </Card>
    </div>
  );
}
