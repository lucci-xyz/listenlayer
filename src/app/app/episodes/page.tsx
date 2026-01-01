import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function EpisodesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const episodes = await prisma.episode.findMany({
    where: { site: { userId: user.id } },
    include: { site: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Episodes</h1>
        <p className="text-sm text-zinc-500">All episodes across your sites.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {episodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-zinc-500">
                  No episodes yet.
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
                  <TableCell>
                    <Badge variant={episode.status === "PUBLISHED" ? "default" : "secondary"}>
                      {episode.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {episode.createdAt.toLocaleString()}
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
