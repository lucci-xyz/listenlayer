"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Search } from "lucide-react";

export type EpisodeListItem = {
  id: string;
  title: string;
  status: "QUEUED" | "RUNNING" | "PUBLISHED" | "FAILED" | "CANCELLED";
  createdAt: string;
  sourceUrl: string;
  publicId: string | null;
  feedName?: string | null;
  feedId?: string | null;
  sourceDomain: string;
};

const filters = ["All", "Published", "Processing", "Failed", "Canceled"] as const;

export default function EpisodesClient({
  episodes,
}: {
  episodes: EpisodeListItem[];
  baseUrl: string;
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

  const statusColor = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-100 text-emerald-700";
      case "RUNNING":
      case "QUEUED":
        return "bg-amber-100 text-amber-700";
      case "FAILED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filters.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filter === opt
                  ? "bg-foreground text-background shadow-md"
                  : "bg-white border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              }`}
              onClick={() => setFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search episodes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-white border-border/60 rounded-xl"
          />
        </div>
      </div>

      {/* List Card */}
      <div className="rounded-[2rem] bg-white border border-border/50 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No episodes found matching your filters.
          </div>
        ) : (
          <div className="divide-y divide-border/40 p-2">
            {filtered.map((ep) => (
              <div
                key={ep.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-secondary/50 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${ep.status === 'PUBLISHED' ? 'bg-emerald-400' : ep.status === 'FAILED' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium text-foreground truncate text-base">{ep.title}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>{ep.feedName || ep.sourceDomain}</span>
                      <span className="hidden sm:inline text-border">•</span>
                      <span>{formatRelativeTime(ep.createdAt)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${statusColor(ep.status)}`}>
                        {statusText(ep.status)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pl-6 sm:pl-0">
                  {(ep.status === "QUEUED" || ep.status === "RUNNING") && (
                    <Button size="sm" variant="outline" onClick={() => handleCancel(ep.id)} className="text-xs h-8 rounded-lg">
                      Stop
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline" className="text-xs h-8 rounded-lg gap-1">
                    <Link href={`/app/episodes/${ep.id}`}>
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
