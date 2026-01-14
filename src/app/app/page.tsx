import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/time";
import { AudioLines, Play, Rss } from "lucide-react";
import { CreateAudioCard } from "@/components/create-audio-card";
import { getDomainFromUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [episodeCount, activeCount, playCount, feeds] = await Promise.all([
    prisma.episode.count({ where: { userId: user.id } }),
    prisma.episode.count({
      where: {
        userId: user.id,
        status: { in: ["QUEUED", "RUNNING"] },
      },
    }),
    prisma.playbackEvent.count({
      where: { episode: { userId: user.id }, kind: "play" },
    }),
    prisma.feed.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { episodes: true } },
      },
    }),
  ]);

  const recentEpisodes = await prisma.episode.findMany({
    where: { userId: user.id },
    include: { feed: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const statusText = (status: string) => {
    const map: Record<string, string> = {
      PUBLISHED: "Published",
      QUEUED: "Queued",
      RUNNING: "Generating",
      FAILED: "Failed",
      CANCELLED: "Canceled",
    };
    return map[status] ?? status;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "text-emerald-600";
      case "RUNNING":
      case "QUEUED":
        return "text-amber-600";
      case "FAILED":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  // First time user - show welcome
  if (episodeCount === 0 && feeds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10">
            <AudioLines className="h-7 w-7 text-violet-600" />
          </div>
          <h1 className="font-display text-2xl tracking-tight">Turn any article into audio</h1>
          <p className="mt-2 text-muted-foreground">
            Paste a link and we'll generate a podcast episode in minutes.
          </p>
        </div>

        <CreateAudioCard />

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card/50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <AudioLines className="h-4 w-4 text-violet-600" />
              </div>
              <h3 className="font-medium">Single article</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste any article URL and generate a one-off podcast episode. Perfect for sharing individual pieces.
            </p>
          </div>
          
          <div className="rounded-xl border border-border/60 bg-card/50 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Rss className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="font-medium">Feed subscription</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Subscribe to a blog or publication. We'll show you new articles and you can generate episodes on demand.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Create audio card - always at top */}
      <CreateAudioCard />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Episodes", value: episodeCount, icon: AudioLines },
          { label: "Plays", value: playCount, icon: Play },
          { label: "Feeds", value: feeds.length, icon: Rss },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <stat.icon className="h-3.5 w-3.5" />
              {stat.label}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Generating indicator */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          {activeCount} episode{activeCount > 1 ? "s" : ""} generating…
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent episodes */}
        <div className="rounded-2xl border border-border/70 bg-card">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <h2 className="font-medium">Recent episodes</h2>
            <Link
              href="/app/episodes"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </div>

          {recentEpisodes.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No episodes yet. Paste a link above to get started.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {recentEpisodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/app/episodes/${episode.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{episode.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {episode.feed?.name || getDomainFromUrl(episode.sourceUrl)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs">
                    <span className={statusColor(episode.status)}>{statusText(episode.status)}</span>
                    <span className="text-muted-foreground">{formatRelativeTime(episode.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Feed subscriptions */}
        <div className="rounded-2xl border border-border/70 bg-card">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <h2 className="font-medium">Feed subscriptions</h2>
            <Link
              href="/app/feeds"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage →
            </Link>
          </div>

          {feeds.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No feed subscriptions yet.
              </p>
              <Link
                href="/app/feeds/new"
                className="text-sm text-violet-600 hover:text-violet-700"
              >
                Add a feed →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {feeds.map((feed) => (
                <Link
                  key={feed.id}
                  href={`/app/feeds/${feed.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Rss className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{feed.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {feed._count.episodes} episode{feed._count.episodes !== 1 ? "s" : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
