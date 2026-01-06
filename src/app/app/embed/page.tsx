import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
import { embedConfigToQuery, embedHeight, mergeEmbedConfig } from "@/lib/embed";
import { formatRelativeTime } from "@/lib/time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const siteParam = Array.isArray(params.siteId) ? params.siteId[0] : params.siteId;
  const publicIdParam = Array.isArray(params.publicId) ? params.publicId[0] : params.publicId;

  const sites = await prisma.site.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

      if (sites.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-[13px] text-muted-foreground">
            Create a show to preview the player.
          </p>
          <Button asChild className="mt-4">
            <Link href="/app/onboarding">New show</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeSite = sites.find((site) => site.id === siteParam) || sites[0];
  const baseUrl = getBaseUrl();
  const config = mergeEmbedConfig(activeSite.embedConfig);
  const query = embedConfigToQuery(config);
  const height = embedHeight(config);

  const episode = publicIdParam
    ? await prisma.episode.findFirst({
        where: { publicId: publicIdParam, site: { userId: user.id } },
      })
    : await prisma.episode.findFirst({
        where: { siteId: activeSite.id, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
      });

  const embedUrl = episode ? `${baseUrl}/embed/e/${episode.publicId}?${query}` : null;
  const iframeSnippet = embedUrl
    ? `<iframe src=\"${embedUrl}\" style=\"width:100%;height:${height}px;border:0\" loading=\"lazy\"></iframe>`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <EmbedButton
          label="Copy embed"
          publicId={episode?.publicId || null}
          baseUrl={baseUrl}
          config={config}
        />
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-[3px]">
        {sites.map((site) => (
          <Button
            key={site.id}
            asChild
            size="sm"
            variant="ghost"
            className={
              site.id === activeSite.id
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            <Link href={`/app/embed?siteId=${site.id}`}>{site.name}</Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Live player</CardTitle>
          </CardHeader>
          <CardContent>
            {embedUrl ? (
              <div className="rounded-lg border border-border/70 bg-background p-4">
                <iframe
                  title="Embed preview"
                  src={embedUrl}
                  style={{ height }}
                  className="w-full"
                  loading="lazy"
                />
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                Publish an episode to preview the embed.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[13px]">
            <div>
              <div className="text-[12px] font-medium text-muted-foreground">Show</div>
              <div className="text-[13px] text-foreground">{activeSite.name}</div>
            </div>
            <div>
              <div className="text-[12px] font-medium text-muted-foreground">Latest episode</div>
              <div className="text-[13px] text-muted-foreground">
                {episode?.publishedAt
                  ? formatRelativeTime(episode.publishedAt)
                  : "No published episodes yet"}
              </div>
            </div>
            {iframeSnippet ? <CopyField label="Iframe snippet" value={iframeSnippet} mono /> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
