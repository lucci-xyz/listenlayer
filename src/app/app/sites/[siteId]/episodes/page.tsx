import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SiteEpisodesPage({
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

  const episodes = await prisma.episode.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Episodes</h2>
        <p className="text-sm text-zinc-500">Latest episodes generated for this site.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {episodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-zinc-500">
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
