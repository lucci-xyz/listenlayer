import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/time";
import { getPlanFromPriceId } from "@/lib/stripe";
import { AudioLines, ArrowRight, Rss, Play, BarChart3, Radio } from "lucide-react";
import { CreateAudioCard } from "@/components/create-audio-card";
import { EpisodePlaysChart } from "@/components/episode-plays-chart";
import { UpgradeModalTrigger } from "@/components/upgrade-modal-trigger";
import { getDomainFromUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const currentPlan = getPlanFromPriceId(user.subscriptionPriceId ?? null);

  // Fetch data in parallel
  const [episodeStats, recentEpisodes, feeds] = await Promise.all([
    // 1. Stats & Chart Data
    prisma.episode.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        title: true,
        _count: {
          select: { playbackEvents: { where: { kind: "play" } } }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // 2. Recent Episodes List
    prisma.episode.findMany({
      where: { userId: user.id },
      include: { feed: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // 3. Feeds List
    prisma.feed.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { episodes: true } } },
      take: 5,
    }),
  ]);

  const episodeCount = await prisma.episode.count({ where: { userId: user.id } });
  const playCount = await prisma.playbackEvent.count({
    where: { episode: { userId: user.id }, kind: "play" },
  });

  // Prepare chart data
  const chartData = episodeStats.map(ep => ({
    id: ep.id,
    title: ep.title,
    playCount: ep._count.playbackEvents
  }));

  // First time user - show simple welcome
  if (episodeCount === 0 && feeds.length === 0) {
    return (
      <>
        <UpgradeModalTrigger currentPlan={currentPlan} />
        <div className="max-w-xl mx-auto pt-16">
          <h1 className="font-display text-3xl mb-3 text-foreground">Welcome</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Paste an article URL to create your first audio episode.
          </p>
          <CreateAudioCard />
        </div>
      </>
    );
  }

  return (
    <>
      <UpgradeModalTrigger currentPlan={currentPlan} />
      <div className="space-y-10 max-w-6xl">
        <div className="flex items-end justify-between border-b border-border pb-6">
          <h1 className="font-display text-4xl text-foreground">Overview</h1>
        </div>

      {/* Stats & Chart Section */}
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Total Episodes Counter */}
        <div className="flex flex-col justify-center rounded-[2rem] bg-white p-8 shadow-sm border border-border/50">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <AudioLines className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium uppercase tracking-wide">Total Episodes</span>
          </div>
          <div className="font-display text-[5rem] leading-none text-foreground">
            {episodeCount}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 text-primary font-medium bg-primary/5 px-2.5 py-1 rounded-full">
              <BarChart3 className="h-3.5 w-3.5" />
              {playCount} plays
            </span>
            <span>all time</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex flex-col justify-between rounded-[2rem] bg-white p-8 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-medium text-muted-foreground">Recent Performance</h3>
            <span className="text-xs text-muted-foreground/60">Plays per episode</span>
          </div>
          <EpisodePlaysChart episodes={chartData} />
        </div>
      </div>

      {/* Create Audio Generator */}
      <section>
        <CreateAudioCard />
      </section>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Episodes */}
        <div className="group flex flex-col rounded-[2rem] bg-white border border-border/50 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Play className="h-5 w-5 fill-current" />
              </div>
              <span className="font-semibold text-foreground">Recent episodes</span>
            </div>
            <Link href="/app/episodes" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              View all →
            </Link>
          </div>
          
          <div className="flex-1 p-2">
            {recentEpisodes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No episodes yet
              </div>
            ) : (
              <div className="space-y-1">
                {recentEpisodes.map((episode) => (
                  <Link
                    key={episode.id}
                    href={`/app/episodes/${episode.id}`}
                    className="flex items-center gap-4 px-6 py-4 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0 opacity-50" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{episode.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{formatRelativeTime(episode.createdAt)}</span>
                        <span>•</span>
                        <span>{episode.feed?.name || getDomainFromUrl(episode.sourceUrl)}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Feeds */}
        <div className="group flex flex-col rounded-[2rem] bg-white border border-border/50 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Radio className="h-5 w-5" />
              </div>
              <span className="font-semibold text-foreground">Feeds</span>
            </div>
            <Link href="/app/feeds" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Manage →
            </Link>
          </div>
          
          <div className="flex-1 p-2">
            {feeds.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No feeds yet</p>
                <Link href="/app/feeds/new" className="text-primary font-medium hover:underline">
                  Add a feed →
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {feeds.slice(0, 5).map((feed) => (
                  <Link
                    key={feed.id}
                    href={`/app/feeds/${feed.id}`}
                    className="flex items-center gap-4 px-6 py-4 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-border text-muted-foreground">
                      <span className="text-xs font-bold">{feed.name.slice(0,1)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{feed.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {feed._count.episodes} episode{feed._count.episodes !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
