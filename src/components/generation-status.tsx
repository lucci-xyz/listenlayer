"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

// Polling intervals - poll faster when active, slower when idle
const ACTIVE_POLL_INTERVAL = 3000;  // 3s when generating
const IDLE_POLL_INTERVAL = 30000;   // 30s when idle (no active generations)
const MAX_CONSECUTIVE_ERRORS = 3;   // Stop polling after consecutive errors

export function GenerationStatus() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [stopping, setStopping] = useState(false);
  const [showCompleteNotice, setShowCompleteNotice] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Assume auth until proven otherwise
  const previousActiveCount = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveErrorsRef = useRef(0);

  const fetchStatus = useCallback(async (): Promise<{ data: StatusResponse | null; shouldContinue: boolean }> => {
    try {
      const res = await fetch("/api/episodes/status", { cache: "no-store" });
      
      // Stop polling on auth errors - user not logged in
      if (res.status === 401 || res.status === 403) {
        setIsAuthenticated(false);
        return { data: null, shouldContinue: false };
      }
      
      if (!res.ok) {
        consecutiveErrorsRef.current++;
        // Stop polling after too many consecutive errors
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          return { data: null, shouldContinue: false };
        }
        return { data: null, shouldContinue: true };
      }
      
      // Reset error count on success
      consecutiveErrorsRef.current = 0;
      setIsAuthenticated(true);
      
      const json = (await res.json()) as StatusResponse;
      setData(json);
      return { data: json, shouldContinue: true };
    } catch {
      consecutiveErrorsRef.current++;
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        return { data: null, shouldContinue: false };
      }
      return { data: null, shouldContinue: true };
    }
  }, []);

  // Smart polling with adaptive intervals
  const scheduleNextPoll = useCallback((hasActiveGenerations: boolean, shouldContinue: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Don't schedule if we should stop polling
    if (!shouldContinue) {
      return;
    }
    
    const interval = hasActiveGenerations ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;
    timeoutRef.current = setTimeout(async () => {
      const result = await fetchStatus();
      scheduleNextPoll(result.data ? result.data.activeCount > 0 : false, result.shouldContinue);
    }, interval);
  }, [fetchStatus]);

  useEffect(() => {
    // Initial fetch
    fetchStatus().then(result => {
      if (result.shouldContinue) {
        scheduleNextPoll(result.data ? result.data.activeCount > 0 : false, result.shouldContinue);
      }
    });
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchStatus, scheduleNextPoll]);

  useEffect(() => {
    if (!data) return;
    if (previousActiveCount.current === null) {
      previousActiveCount.current = data.activeCount;
      return;
    }

    if (previousActiveCount.current > 0 && data.activeCount === 0) {
      setShowCompleteNotice(true);
    }

    if (data.activeCount > 0) {
      setShowCompleteNotice(false);
    }

    previousActiveCount.current = data.activeCount;
  }, [data]);

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
      // Immediately refresh and reschedule
      const result = await fetchStatus();
      scheduleNextPoll(result.data ? result.data.activeCount > 0 : false, result.shouldContinue);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop");
    } finally {
      setStopping(false);
    }
  };

  const latestEpisode = data?.activeEpisodes?.[0];

  // Don't render if not authenticated or no data to show
  if (!isAuthenticated || !data || (data.activeCount === 0 && !showCompleteNotice)) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl rounded-full border border-border/60 bg-card/95 px-4 py-2 shadow-soft-md backdrop-blur">
        {data.activeCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <div className="text-sm font-medium text-foreground">
                Generating {data.activeCount} episode{data.activeCount === 1 ? "" : "s"}
              </div>
              {latestEpisode ? (
                <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                  Latest: {latestEpisode.title}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={handleStopAll} disabled={stopping}>
                {stopping ? "Stopping..." : "Stop"}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/episodes">View queue</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-success" />
              <div className="text-sm font-medium text-foreground">
                Generation complete
              </div>
              <div className="text-xs text-muted-foreground">
                Your audio is ready.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/app/episodes">View episodes</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCompleteNotice(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
