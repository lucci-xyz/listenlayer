import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const episodes = await prisma.episode.findMany({
    where: { site: { userId: user.id } },
    include: { site: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const playbackCounts = episodes.length
    ? await prisma.playbackEvent.groupBy({
        by: ["episodeId", "kind", "value"],
        _count: { _all: true },
      })
    : [];

  const stats: Record<
    string,
    { plays: number; progress: Record<number, number> }
  > = {};
  for (const row of playbackCounts) {
    if (!stats[row.episodeId]) {
      stats[row.episodeId] = { plays: 0, progress: {} };
    }
    if (row.kind === "play") {
      stats[row.episodeId].plays += row._count._all;
    }
    if (row.kind === "progress" && row.value !== null) {
      stats[row.episodeId].progress[row.value] =
        (stats[row.episodeId].progress[row.value] || 0) + row._count._all;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500">Playback events across your latest episodes.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Episode</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Plays</TableHead>
              <TableHead>25%</TableHead>
              <TableHead>50%</TableHead>
              <TableHead>75%</TableHead>
              <TableHead>100%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {episodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-zinc-500">
                  No analytics yet.
                </TableCell>
              </TableRow>
            ) : (
              episodes.map((episode) => (
                <TableRow key={episode.id}>
                  <TableCell>
                    <Link
                      href={`/app/episodes/${episode.id}`}
                      className="text-sm font-semibold text-zinc-900 underline"
                    >
                      {episode.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">{episode.site.name}</TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {stats[episode.id]?.plays || 0}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {stats[episode.id]?.progress?.[25] || 0}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {stats[episode.id]?.progress?.[50] || 0}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {stats[episode.id]?.progress?.[75] || 0}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {stats[episode.id]?.progress?.[100] || 0}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
