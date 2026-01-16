import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/time";
import { getPlanFromPriceId } from "@/lib/stripe";
import { AudioLines, ArrowRight, Play, BarChart3, Radio } from "lucide-react";
import { CreateAudioCard } from "@/components/create-audio-card";
import { EpisodePlaysChart } from "@/components/episode-plays-chart";
import { UpgradeModalTrigger } from "@/components/upgrade-modal-trigger";
import { getDomainFromUrl } from "@/lib/url";
import { FeedIcon } from "@/components/feed-icon";

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
  const latestEpisode = recentEpisodes[0] ?? null;

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
            Paste an article or RSS feed URL to create your first audio episode.
          </p>
          <CreateAudioCard
            currentPlan={currentPlan}
            creditsResetAt={user.subscriptionCurrentPeriodEnd?.toISOString() ?? null}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <UpgradeModalTrigger currentPlan={currentPlan} />
      <div className="space-y-10 w-full max-w-6xl">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-4xl text-foreground">Overview</h1>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              At a glance
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <AudioLines className="h-3.5 w-3.5 text-primary" />
                </span>
                Total episodes
              </div>
              <div className="mt-4 font-display text-4xl text-foreground">{episodeCount}</div>
              <div className="mt-2 text-sm text-muted-foreground">Created so far</div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                </span>
                Total plays
              </div>
              <div className="mt-4 font-display text-4xl text-foreground">{playCount}</div>
              <div className="mt-2 text-sm text-muted-foreground">All-time listens</div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Play className="h-3.5 w-3.5 text-primary" />
                </span>
                Latest episode
              </div>
              {latestEpisode ? (
                <>
                  <Link
                    href={`/app/episodes/${latestEpisode.id}`}
                    className="mt-3 block text-base font-semibold text-foreground hover:underline"
                  >
                    {latestEpisode.title}
                  </Link>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {formatRelativeTime(latestEpisode.createdAt)}
                  </div>
                </>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">No episodes yet.</div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="font-medium text-foreground">Recent performance</h3>
            <span className="text-xs text-muted-foreground">Plays per episode</span>
          </div>
          <EpisodePlaysChart episodes={chartData} />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create new episode</h2>
            <p className="text-sm text-muted-foreground">
              Paste a link or RSS feed, review the source, then choose a narration style.
            </p>
          </div>
          <CreateAudioCard
            currentPlan={currentPlan}
            creditsResetAt={user.subscriptionCurrentPeriodEnd?.toISOString() ?? null}
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Recent Episodes */}
          <div className="group flex flex-col rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden transition-shadow hover:shadow-soft-md">
            <div className="flex flex-col gap-3 px-6 py-5 border-b border-border/40 bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
                      className="flex items-center gap-4 px-4 py-4 sm:px-6 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0 opacity-60" />
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
          <div className="group flex flex-col rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden transition-shadow hover:shadow-soft-md">
            <div className="flex flex-col gap-3 px-6 py-5 border-b border-border/40 bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
                      className="flex items-center gap-4 px-4 py-4 sm:px-6 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <FeedIcon
                        url={feed.faviconUrl}
                        className="h-10 w-10 rounded-full border border-border/60 bg-muted/40"
                        fallbackClassName="h-4 w-4"
                      />
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
