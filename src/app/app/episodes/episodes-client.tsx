"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { getDomainFromUrl } from "@/lib/url";
import { formatRelativeTime } from "@/lib/time";
import { mergeEmbedConfig } from "@/lib/embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmbedButton } from "@/components/embed-button";
import { toast } from "sonner";

export type EpisodeListItem = {
  id: string;
  title: string;
  status: "QUEUED" | "RUNNING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  createdAt: string;
  sourceUrl: string;
  publicId: string | null;
  siteName?: string;
  siteId: string;
  embedConfig?: unknown;
};

const filters = ["All", "Published", "Processing", "Failed", "Canceled"] as const;

export default function EpisodesClient({
  episodes,
  baseUrl,
  showSite,
}: {
  episodes: EpisodeListItem[];
  baseUrl: string;
  showSite?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = [...episodes];
    if (normalized) {
      list = list.filter((episode) => episode.title.toLowerCase().includes(normalized));
    }
    if (filter !== "All") {
      list = list.filter((episode) => {
        if (filter === "Published") return episode.status === "PUBLISHED";
        if (filter === "Failed") return episode.status === "FAILED";
        if (filter === "Canceled") return episode.status === "CANCELLED";
        return episode.status === "QUEUED" || episode.status === "RUNNING";
      });
    }
    list.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
    return list;
  }, [episodes, query, filter, sort]);

  const inProgress = filtered.filter((episode) =>
    episode.status === "QUEUED" || episode.status === "RUNNING"
  );
  const rest = filtered.filter((episode) =>
    episode.status !== "QUEUED" && episode.status !== "RUNNING"
  );

  const handleCancel = async (episodeId: string) => {
    try {
      const res = await fetch("/api/episodes/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId }),
      });
      if (!res.ok) {
        throw new Error("Failed to stop generation");
      }
      toast.success("Generation stopped.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop");
    }
  };

  const renderEpisode = (episode: EpisodeListItem) => {
    const config = mergeEmbedConfig(episode.embedConfig || null);
    const statusLabel = episode.status === "CANCELLED" ? "Canceled" : episode.status;
    return (
      <Card key={episode.id}>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[13px] font-semibold text-foreground">
                {episode.title}
              </h3>
              <Badge variant={episode.status === "PUBLISHED" ? "default" : "secondary"}>
                {statusLabel}
              </Badge>
              <span className="text-[12px] text-muted-foreground">
                {formatRelativeTime(episode.createdAt)}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
              <span>{getDomainFromUrl(episode.sourceUrl)}</span>
              {showSite && episode.siteName ? <span>Publication: {episode.siteName}</span> : null}
            </div>
            {episode.status === "RUNNING" || episode.status === "QUEUED" ? (
              <div className="text-[12px] text-muted-foreground">Generating…</div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/app/episodes/${episode.id}`}>Open</Link>
            </Button>
            {episode.status === "QUEUED" || episode.status === "RUNNING" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel(episode.id)}
              >
                Stop
              </Button>
            ) : null}
            <EmbedButton
              label="Copy embed"
              size="sm"
              variant="outline"
              publicId={episode.status === "PUBLISHED" ? episode.publicId : null}
              baseUrl={baseUrl}
              config={config}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>Regenerate (soon)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Delete (soon)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 rounded-full border border-border bg-white p-1 shadow-soft">
          {filters.map((option) => (
            <Button
              key={option}
              size="sm"
              variant={filter === option ? "default" : "ghost"}
              className={filter === option ? "text-white" : "text-muted-foreground"}
              onClick={() => setFilter(option)}
            >
              {option}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search episodes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-48"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {sort === "newest" ? "Newest" : "Oldest"}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-[13px] text-muted-foreground">
            No episodes yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inProgress.length > 0 ? (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                In progress
              </div>
              {inProgress.map(renderEpisode)}
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="space-y-3">
              {inProgress.length > 0 ? (
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Library
                </div>
              ) : null}
              {rest.map(renderEpisode)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
