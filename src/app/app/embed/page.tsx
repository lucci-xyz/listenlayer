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
            Create a publication to preview embeds.
          </p>
          <Button asChild className="mt-4">
            <Link href="/app/onboarding">Add publication</Link>
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

      <div className="flex flex-wrap gap-2 rounded-full border border-border bg-white p-1 shadow-soft">
        {sites.map((site) => (
          <Button
            key={site.id}
            asChild
            size="sm"
            variant={site.id === activeSite.id ? "default" : "ghost"}
            className={site.id === activeSite.id ? "text-white" : "text-muted-foreground"}
          >
            <Link href={`/app/embed?siteId=${site.id}`}>{site.name}</Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Live embed</CardTitle>
          </CardHeader>
          <CardContent>
            {embedUrl ? (
              <div className="rounded-xl border border-border bg-white p-4">
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Publication
              </div>
              <div className="text-[13px] text-foreground">{activeSite.name}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Latest publish
              </div>
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
