"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/time";
import { toast } from "sonner";

type StatusEpisode = {
  id: string;
  title: string;
  status: "QUEUED" | "RUNNING";
  createdAt: string;
  siteName: string;
};

type StatusResponse = {
  activeCount: number;
  activeEpisodes: StatusEpisode[];
};

export function GenerationStatus() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [stopping, setStopping] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/episodes/status", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as StatusResponse;
      setData(json);
    } catch {
      // Ignore transient errors.
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (!data || data.activeCount === 0) return null;

  const handleStopAll = async () => {
    setStopping(true);
    try {
      const res = await fetch("/api/episodes/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error("Failed to stop generation");
      }
      toast.success("Stopped all active generations.");
      fetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop");
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-amber-900">Generation in progress</div>
          <div className="text-xs text-amber-700">
            {data.activeCount} episode{data.activeCount === 1 ? "" : "s"} in the queue
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleStopAll} disabled={stopping}>
            {stopping ? "Stopping..." : "Stop all"}
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/app/episodes">View queue</Link>
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        {data.activeEpisodes.map((episode) => (
          <div key={episode.id} className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
            <Badge variant="secondary">{episode.status}</Badge>
            <span className="font-medium text-amber-900">{episode.title}</span>
            <span className="text-amber-700">• {episode.siteName}</span>
            <span className="text-amber-600">{formatRelativeTime(episode.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
