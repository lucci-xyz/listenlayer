import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/time";
import { AudioLines, BarChart3, Layers, Play, Plus, Zap, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    PUBLISHED: { label: "Published", className: "bg-green-50 text-green-700 border-green-200" },
    QUEUED: { label: "Queued", className: "bg-amber-50 text-amber-700 border-amber-200" },
    RUNNING: { label: "Generating", className: "bg-blue-50 text-blue-700 border-blue-200" },
    FAILED: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200" },
    CANCELLED: { label: "Canceled", className: "bg-gray-50 text-gray-600 border-gray-200" },
  };
  const config = statusConfig[status] ?? { label: status, className: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const sites = await prisma.site.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const [episodeCount, activeCount, playCount] = await Promise.all([
    prisma.episode.count({ where: { site: { userId: user.id } } }),
    prisma.episode.count({
      where: {
        site: { userId: user.id },
        status: { in: ["QUEUED", "RUNNING"] },
      },
    }),
    prisma.playbackEvent.count({
      where: { episode: { site: { userId: user.id } }, kind: "play" },
    }),
  ]);

  const recentEpisodes = await prisma.episode.findMany({
    where: { site: { userId: user.id } },
    include: { site: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const perSiteCounts = await prisma.episode.groupBy({
    by: ["siteId"],
    _count: { _all: true },
    where: { site: { userId: user.id } },
  });

  const perSiteMap = new Map(
    perSiteCounts.map((row) => [row.siteId, row._count._all])
  );

  // Show onboarding if no sites yet
  if (sites.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-600/5">
          <AudioLines className="h-7 w-7 text-violet-600" />
        </div>
        <h1 className="font-display text-2xl tracking-tight">Welcome to ListenLayer</h1>
        <p className="mt-2 text-muted-foreground">
          Create your first show to start turning written content into audio episodes.
        </p>
        <Button asChild className="mt-6">
          <Link href="/app/onboarding">
            <Plus className="mr-2 h-4 w-4" />
            Create your first show
          </Link>
        </Button>
        
        <div className="mt-16 grid gap-8 text-left sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Quick setup",
              description: "Connect any website or RSS feed in seconds",
            },
            {
              icon: AudioLines,
              title: "AI narration",
              description: "Professional audio generated automatically",
            },
            {
              icon: BarChart3,
              title: "Track engagement",
              description: "See what content resonates with listeners",
            },
          ].map((feature) => (
            <div key={feature.title}>
              <feature.icon className="h-5 w-5 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-medium">{feature.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your audio content
          </p>
        </div>
        <Button asChild>
          <Link href="/app/onboarding">
            <Plus className="mr-2 h-4 w-4" />
            New show
          </Link>
        </Button>
      </div>

      {/* Stats row — hero metric + compact cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {/* Hero metric: episode credits */}
        <div className="sm:col-span-1 rounded-2xl border border-border/70 bg-gradient-to-br from-violet-500/5 to-transparent p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Zap className="h-4 w-4 text-violet-600" />
            Episode credits
          </div>
          <div className="mt-3 text-4xl font-semibold tabular-nums">
            {user.episodeCredits}
          </div>
          <Link 
            href="/app/settings" 
            className="mt-2 inline-flex items-center text-xs text-violet-600 hover:text-violet-700"
          >
            Manage plan →
          </Link>
        </div>

        {/* Compact stats */}
        <div className="sm:col-span-3 grid grid-cols-3 gap-3">
          {[
            { label: "Shows", value: sites.length, icon: Layers },
            { label: "Episodes", value: episodeCount, icon: AudioLines },
            { label: "Total plays", value: playCount, icon: Play },
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
      </div>

      {/* Generating indicator */}
      {activeCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="font-medium text-amber-800">
              {activeCount} episode{activeCount > 1 ? "s" : ""} generating
            </span>
          </span>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent episodes — structured table */}
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
            <div className="p-8">
              <EmptyState
                title="No episodes yet"
                description="Generate your first episode from a show"
              />
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <div>Title</div>
                <div className="w-20 text-center">Status</div>
                <div className="w-16 text-right">Plays</div>
                <div className="w-20 text-right">Age</div>
              </div>
              
              {/* Rows */}
              {recentEpisodes.map((episode) => (
                <Link
                  key={episode.id}
                  href={`/app/episodes/${episode.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{episode.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{episode.site.name}</div>
                  </div>
                  <div className="w-20 text-center">
                    <StatusPill status={episode.status} />
                  </div>
                  <div className="w-16 text-right text-sm tabular-nums text-muted-foreground">
                    —
                  </div>
                  <div className="w-20 text-right text-xs text-muted-foreground">
                    {formatRelativeTime(episode.createdAt)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Shows list */}
        <div className="rounded-2xl border border-border/70 bg-card">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <h2 className="font-medium">Your shows</h2>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/app/onboarding">
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Link>
            </Button>
          </div>
          
          <div className="divide-y divide-border/50">
            {sites.map((site) => {
              const count = perSiteMap.get(site.id) ?? 0;
              return (
                <Link
                  key={site.id}
                  href={`/app/sites/${site.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-sm font-semibold text-primary">
                    {site.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{site.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {count} episode{count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                </Link>
              );
            })}
            
            {sites.length === 0 && (
              <div className="p-8">
                <EmptyState
                  title="No shows yet"
                  description="Create your first show to get started"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
