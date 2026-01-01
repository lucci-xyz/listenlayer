import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Workspaces</h1>
          <p className="text-sm text-zinc-500">
            Connect a content source and ship new audio episodes fast.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/onboarding">Add workspace</Link>
        </Button>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-zinc-500">
              No workspaces yet. Add your first workspace to get started.
            </p>
            <Button asChild className="mt-4">
              <Link href="/app/onboarding">Start onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => {
            const favicon = site.domain ? `https://${site.domain}/favicon.ico` : null;
            return (
              <Link key={site.id} href={`/app/sites/${site.id}`} className="group">
                <Card className="transition group-hover:border-zinc-300 group-hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 py-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-lg font-semibold text-zinc-700">
                      {favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={favicon} alt="" className="h-6 w-6" />
                      ) : (
                        site.name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">{site.name}</div>
                      <div className="text-xs text-zinc-500">Workspace</div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
