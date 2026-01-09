"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
};

const filters = ["All", "Published", "Processing", "Failed", "Canceled"] as const;

export default function EpisodesClient({
  episodes,
  showSite,
}: {
  episodes: EpisodeListItem[];
  baseUrl: string;
  showSite?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = [...episodes];
    if (normalized) {
      list = list.filter((ep) => ep.title.toLowerCase().includes(normalized));
    }
    if (filter !== "All") {
      list = list.filter((ep) => {
        if (filter === "Published") return ep.status === "PUBLISHED";
        if (filter === "Failed") return ep.status === "FAILED";
        if (filter === "Canceled") return ep.status === "CANCELLED";
        return ep.status === "QUEUED" || ep.status === "RUNNING";
      });
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [episodes, query, filter]);

  const handleCancel = async (episodeId: string) => {
    try {
      const res = await fetch("/api/episodes/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId }),
      });
      if (!res.ok) throw new Error("Failed to stop generation");
      toast.success("Generation stopped.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop");
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-md bg-muted/60 p-1">
          {filters.map((opt) => (
            <Button
              key={opt}
              size="sm"
              variant="ghost"
              className={
                filter === opt ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
              }
              onClick={() => setFilter(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
        <div className="ml-auto">
          <Input
            placeholder="Search episodes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-52"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card py-10 text-center text-sm text-muted-foreground">
          No episodes yet.
        </div>
      ) : (
        <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card">
          {filtered.map((ep) => (
            <div
              key={ep.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{ep.title}</div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {showSite && ep.siteName && <span>{ep.siteName}</span>}
                  <span>{statusText(ep.status)}</span>
                  <span>{formatRelativeTime(ep.createdAt)}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(ep.status === "QUEUED" || ep.status === "RUNNING") && (
                  <Button size="sm" variant="outline" onClick={() => handleCancel(ep.id)}>
                    Stop
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/app/episodes/${ep.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
