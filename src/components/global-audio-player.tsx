"use client";

import { useRef, type MouseEvent } from "react";
import { Pause, Play, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAudioPlayback } from "@/components/audio-playback-provider";
import { cn } from "@/lib/utils";

function formatTime(value: number) {
  if (!isFinite(value)) return "--:--";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function GlobalAudioPlayer() {
  const pathname = usePathname();
  const playback = useAudioPlayback();
  const barRef = useRef<HTMLDivElement | null>(null);

  if (!playback) return null;
  if (pathname.startsWith("/embed") || pathname.startsWith("/listen")) {
    return null;
  }

  const { state, toggle, seek, close } = playback;
  if (!state.publicId) return null;

  const progress = state.duration
    ? Math.min(100, (state.currentTime / state.duration) * 100)
    : 0;

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || !state.duration) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seek(ratio * state.duration);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 inset-x-4 z-40 flex justify-center sm:justify-end">
      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-border/60 bg-card/95 px-4 py-3 shadow-soft-lg backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {state.title || "Now playing"}
            </div>
            {state.subtitle ? (
              <div className="text-xs text-muted-foreground truncate">{state.subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Close player"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={state.loading}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90",
              state.loading && "opacity-60"
            )}
            aria-label={state.isPlaying ? "Pause audio" : "Play audio"}
          >
            {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <div className="flex-1">
            <div
              ref={barRef}
              className="relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-muted/70"
              onClick={handleSeek}
              aria-label="Seek"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>
          </div>
        </div>

        {state.loading ? (
          <div className="mt-2 text-xs text-muted-foreground">Loading audio…</div>
        ) : null}
      </div>
    </div>
  );
}
