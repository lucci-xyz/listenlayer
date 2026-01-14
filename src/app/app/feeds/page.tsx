import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/time";
import { getDomainFromUrl } from "@/lib/url";
import { Button } from "@/components/ui/button";
import { Plus, Rss, ArrowRight, ExternalLink } from "lucide-react";
import { FeedIcon } from "@/components/feed-icon";

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
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="font-display text-4xl text-foreground">Feeds</h1>
          <p className="mt-2 text-muted-foreground text-lg">
            Manage your content subscriptions
          </p>
        </div>
        <Button asChild className="rounded-full shadow-sm">
          <Link href="/app/feeds/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Feed
          </Link>
        </Button>
      </div>

      {feeds.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-border/60 bg-white py-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Rss className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No feed subscriptions</h2>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
            Subscribe to a blog to see new articles and generate episodes on demand.
          </p>
          <Button asChild className="mt-8 rounded-full">
            <Link href="/app/feeds/new">Add your first feed</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <Link
              key={feed.id}
              href={`/app/feeds/${feed.id}`}
              className="group flex flex-col justify-between rounded-[2rem] border border-border/50 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-border"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h3 className="font-display text-xl text-foreground line-clamp-1">{feed.name}</h3>
                  <div className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                    {feed._count.episodes} eps
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="truncate">{getDomainFromUrl(feed.feedUrl)}</span>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-4">
                <span className="text-xs font-medium text-muted-foreground/80">
                  {feed.lastFetchedAt ? `Updated ${formatRelativeTime(feed.lastFetchedAt)}` : "Just added"}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground opacity-0 group-hover:opacity-100 transition-all">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
