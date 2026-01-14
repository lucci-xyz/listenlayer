import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/time";
import { getDomainFromUrl } from "@/lib/url";
import { Button } from "@/components/ui/button";
import { Plus, Rss } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Feed Subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Rss className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="font-medium">No feed subscriptions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Subscribe to a blog to see new articles and generate episodes.
          </p>
          <Button asChild className="mt-4">
            <Link href="/app/feeds/new">Add your first feed</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {feeds.map((feed) => (
            <Link
              key={feed.id}
              href={`/app/feeds/${feed.id}`}
              className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Rss className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{feed.name}</div>
                <div className="text-sm text-muted-foreground">
                  {getDomainFromUrl(feed.feedUrl)}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="text-muted-foreground">
                  {feed._count.episodes} episode{feed._count.episodes !== 1 ? "s" : ""}
                </div>
                {feed.lastFetchedAt && (
                  <div className="text-xs text-muted-foreground/70">
                    Updated {formatRelativeTime(feed.lastFetchedAt)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
