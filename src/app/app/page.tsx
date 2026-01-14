import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/time";
import { AudioLines, ArrowRight, Rss, TrendingUp } from "lucide-react";
import { CreateAudioCard } from "@/components/create-audio-card";
import { getDomainFromUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [episodeCount, playCount, feeds] = await Promise.all([
    prisma.episode.count({ where: { userId: user.id } }),
    prisma.playbackEvent.count({
      where: { episode: { userId: user.id }, kind: "play" },
    }),
    prisma.feed.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { episodes: true } } },
    }),
  ]);

  const recentEpisodes = await prisma.episode.findMany({
    where: { userId: user.id },
    include: { feed: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // First time user - show simple welcome
  if (episodeCount === 0 && feeds.length === 0) {
    return (
      <div className="max-w-xl mx-auto pt-16">
        <h1 className="font-display text-3xl mb-3">Welcome</h1>
        <p className="text-muted-foreground mb-8">
          Paste an article URL to create your first audio episode.
        </p>
        <CreateAudioCard />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Page title - single instance */}
      <h1 className="font-display text-4xl text-foreground">Overview</h1>

      {/* Stats - Direct content on white background like reference "Earnings" section */}
      <div className="py-2">
        <div className="text-sm font-medium text-muted-foreground mb-3">Total Episodes</div>
        <div className="flex items-baseline gap-4 mb-6">
          <span className="font-display text-5xl text-foreground">{episodeCount}</span>
          {playCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-sm font-medium text-foreground">
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
              {playCount} plays
            </span>
          )}
        </div>
        
        {/* Bar chart visualization matching reference style */}
        <div className="h-3 rounded-sm overflow-hidden flex w-full max-w-2xl bg-secondary/50">
          <div className="bg-primary border-r-2 border-white" style={{ flex: episodeCount || 1 }} />
          <div className="bg-accent border-r-2 border-white" style={{ flex: Math.max(1, Math.floor(playCount / 10)) }} />
        </div>
        
        <div className="mt-4 flex items-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Episodes</span>
            <span className="font-medium text-foreground">{episodeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-muted-foreground">Plays</span>
            <span className="font-medium text-foreground">{playCount}</span>
          </div>
        </div>
      </div>

      {/* Create audio input */}
      <div className="max-w-3xl">
        <CreateAudioCard />
      </div>

      {/* Two column layout for bottom sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent episodes - Styled as card with border like "To-do" */}
        <div className="rounded-2xl border border-border bg-card p-1">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <span className="font-display text-lg">Recent episodes</span>
            <Link href="/app/episodes" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
          
          {recentEpisodes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No episodes yet
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {recentEpisodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/app/episodes/${episode.id}`}
                  className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-secondary transition-colors group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-muted-foreground group-hover:border-primary/20 group-hover:text-primary transition-colors">
                    <AudioLines className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-foreground">{episode.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {episode.feed?.name || getDomainFromUrl(episode.sourceUrl)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Feeds - Styled as card with border like "Recommended" */}
        <div className="rounded-2xl border border-border bg-card p-1">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <span className="font-display text-lg">Feeds</span>
            <Link href="/app/feeds" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
          
          {feeds.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">No feeds yet</p>
              <Link href="/app/feeds/new" className="text-primary hover:underline font-medium">
                Add a feed →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {feeds.slice(0, 5).map((feed) => (
                <Link
                  key={feed.id}
                  href={`/app/feeds/${feed.id}`}
                  className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-secondary transition-colors group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-muted-foreground group-hover:border-primary/20 group-hover:text-primary transition-colors">
                    <Rss className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{feed.name}</div>
                    <div className="text-sm text-muted-foreground">
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
