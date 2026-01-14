import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/time";
import { getDomainFromUrl } from "@/lib/url";
import { Button } from "@/components/ui/button";
import { Plus, Rss, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FeedsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const feeds = await prisma.feed.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { episodes: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl">Feeds</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor blogs and publications for new content.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/feeds/new">
            <Plus className="mr-2 h-4 w-4" />
            Add feed
          </Link>
        </Button>
      </div>

      {feeds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Rss className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="font-semibold">No feed subscriptions</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Subscribe to a blog to see new articles and generate episodes on demand.
          </p>
          <Button asChild className="mt-6">
            <Link href="/app/feeds/new">Add your first feed</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <Link
              key={feed.id}
              href={`/app/feeds/${feed.id}`}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-soft-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Rss className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{feed.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getDomainFromUrl(feed.feedUrl)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <div className="text-sm">
                  <span className="font-display text-lg">{feed._count.episodes}</span>
                  <span className="text-muted-foreground ml-1">episode{feed._count.episodes !== 1 ? "s" : ""}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              
              {feed.lastFetchedAt && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Updated {formatRelativeTime(feed.lastFetchedAt)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
