import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const episodes = await prisma.episode.findMany({
    where: { userId: user.id },
    include: { feed: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const playbackCounts = episodes.length
    ? await prisma.playbackEvent.groupBy({
        by: ["episodeId", "kind", "value"],
        _count: { _all: true },
      })
    : [];

  const stats: Record<string, { plays: number; completions: number }> = {};
  for (const row of playbackCounts) {
    if (!stats[row.episodeId]) {
      stats[row.episodeId] = { plays: 0, completions: 0 };
    }
    if (row.kind === "play") {
      stats[row.episodeId].plays += row._count._all;
    }
    if (row.kind === "progress" && row.value === 100) {
      stats[row.episodeId].completions += row._count._all;
    }
  }

  const hasData = episodes.some((ep) => (stats[ep.id]?.plays || 0) > 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-border/60 pb-6">
        <h1 className="font-display text-4xl text-foreground">Analytics</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Track episode plays and completion rates.
        </p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No playback data yet. Share an episode to start tracking.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Playback</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Episode</TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {episodes.map((ep) => {
                  const s = stats[ep.id] || { plays: 0, completions: 0 };
                  const completionPct = s.plays > 0 ? Math.round((s.completions / s.plays) * 100) : 0;
                  return (
                    <TableRow key={ep.id}>
                      <TableCell>
                        <Link href={`/app/episodes/${ep.id}`} className="font-medium text-foreground hover:underline">
                          {ep.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {s.plays}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {completionPct}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
