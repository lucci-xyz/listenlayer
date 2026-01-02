import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const sites = await prisma.site.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const [episodeCount, activeCount, playCount] = await Promise.all([
    prisma.episode.count({ where: { site: { userId: user.id } } }),
    prisma.episode.count({
      where: {
        site: { userId: user.id },
        status: { in: ["QUEUED", "RUNNING"] },
      },
    }),
    prisma.playbackEvent.count({
      where: { episode: { site: { userId: user.id } }, kind: "play" },
    }),
  ]);

  const recentEpisodes = await prisma.episode.findMany({
    where: { site: { userId: user.id } },
    include: { site: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const perSiteCounts = await prisma.episode.groupBy({
    by: ["siteId"],
    _count: { _all: true },
    where: { site: { userId: user.id } },
  });

  const perSiteMap = new Map(
    perSiteCounts.map((row) => [row.siteId, row._count._all])
  );
  const maxCount = Math.max(1, ...perSiteCounts.map((row) => row._count._all));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild>
          <Link href="/app/onboarding">Add publication</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          { label: "Publications", value: sites.length.toString(), helper: "All publications" },
          { label: "Episodes", value: episodeCount.toString(), helper: "Total published" },
          { label: "Active", value: activeCount.toString(), helper: "Generating" },
          { label: "Plays", value: playCount.toString(), helper: "All time" },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="space-y-2 py-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                {card.label}
              </div>
              <div className="text-2xl font-semibold text-foreground">{card.value}</div>
              <div className="text-[12px] text-muted-foreground">{card.helper}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent episodes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEpisodes.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">
                No episodes yet.
              </div>
            ) : (
              recentEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div className="space-y-1">
                    <div className="text-[13px] font-semibold text-foreground">
                      {episode.title}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {episode.site.name} · {formatRelativeTime(episode.createdAt)}
                    </div>
                  </div>
                  <Badge variant={episode.status === "PUBLISHED" ? "default" : "secondary"}>
                    {episode.status === "CANCELLED" ? "Canceled" : episode.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sites.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">
                Add a publication to see activity.
              </div>
            ) : (
              sites.map((site) => {
                const count = perSiteMap.get(site.id) ?? 0;
                const width = Math.round((count / maxCount) * 100);
                return (
                  <div key={site.id} className="space-y-2">
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>{site.name}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Publications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sites.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">
                No publications yet. Add your first publication to get started.
              </div>
            ) : (
              sites.map((site) => (
                <Link
                  key={site.id}
                  href={`/app/sites/${site.id}`}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">
                      {site.name}
                    </div>
                    <div className="text-[12px] text-muted-foreground">Publication</div>
                  </div>
                  <span className="text-[12px] text-muted-foreground">
                    {perSiteMap.get(site.id) ?? 0} episodes
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEpisodes.length === 0 ? (
              <div className="text-[13px] text-muted-foreground">No activity yet.</div>
            ) : (
              recentEpisodes.slice(0, 5).map((episode) => (
                <div key={episode.id} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="text-[13px] text-foreground">
                    {episode.title}
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatRelativeTime(episode.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
