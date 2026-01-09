import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
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
          <p className="text-sm text-muted-foreground">Create a show to preview the player.</p>
          <Button asChild className="mt-4">
            <Link href="/app/onboarding">New show</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeSite = sites.find((s) => s.id === siteParam) || sites[0];
  const baseUrl = getBaseUrl();
  const height = embedHeight();

  const episode = publicIdParam
    ? await prisma.episode.findFirst({
        where: { publicId: publicIdParam, site: { userId: user.id } },
      })
    : await prisma.episode.findFirst({
        where: { siteId: activeSite.id, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
      });

  const embedUrl = episode ? `${baseUrl}/embed/e/${episode.publicId}` : null;
  const iframeSnippet = embedUrl
    ? `<iframe src="${embedUrl}" style="width:100%;height:${height}px;border:0;background:transparent" loading="lazy" allow="autoplay"></iframe>`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Embed preview</h1>
        <EmbedButton label="Copy embed" publicId={episode?.publicId || null} baseUrl={baseUrl} />
      </div>

      {/* Site selector as simple links */}
      {sites.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Show:</span>
          <div className="flex gap-1 rounded-md bg-muted/60 p-1">
            {sites.map((s) => (
              <Link
                key={s.id}
                href={`/app/embed?siteId=${s.id}`}
                className={`rounded px-2 py-1 text-sm transition ${
                  s.id === activeSite.id
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Live player preview */}
      <Card>
        <CardContent className="py-5">
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
            <p className="text-sm text-muted-foreground">
              Publish an episode to preview the embed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Copy snippet */}
      {iframeSnippet && (
        <Card>
          <CardContent className="py-5">
            <CopyField label="Iframe snippet" value={iframeSnippet} mono />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
