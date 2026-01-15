"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Pause, Play } from "lucide-react";
import { useAudioPlayback } from "@/components/audio-playback-provider";

const milestones = [25, 50, 75, 100];

async function sendPlayback(publicId: string, kind: "play" | "progress", value?: number) {
  await fetch("/api/analytics/playback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, kind, value }),
  });
}

function formatTime(value: number) {
  if (!isFinite(value)) return "--:--";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioPlayer({
  publicId,
  title,
  subtitle,
  useGlobal = false,
}: {
  publicId: string;
  title?: string;
  subtitle?: string;
  useGlobal?: boolean;
}) {
  const playback = useAudioPlayback();
  const useShared = Boolean(useGlobal && playback);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const reported = useRef<Set<number>>(new Set());
  const played = useRef(false);

  const sharedState = useShared ? playback?.state ?? null : null;
  const isSharedActive = useShared && sharedState?.publicId === publicId;
  const isLoadingShared = Boolean(isSharedActive && sharedState?.loading);
  const sharedError = isSharedActive ? sharedState?.error ?? null : null;
  const resolvedDuration = useShared ? (isSharedActive ? sharedState?.duration ?? 0 : 0) : duration;
  const resolvedCurrentTime = useShared
    ? (isSharedActive ? sharedState?.currentTime ?? 0 : 0)
    : currentTime;
  const resolvedPlaying = useShared ? Boolean(isSharedActive && sharedState?.isPlaying) : isPlaying;
  const progress = resolvedDuration
    ? Math.min(100, (resolvedCurrentTime / resolvedDuration) * 100)
    : 0;

  useEffect(() => {
    if (useShared) return;
    const fetchUrl = async () => {
      try {
        const res = await fetch(`/api/episodes/${publicId}/audio-url`);
        if (!res.ok) throw new Error("Failed to load audio");
        const data = await res.json();
        setAudioUrl(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audio");
      }
    };
    fetchUrl();
  }, [publicId, useShared]);

  useEffect(() => {
    if (useShared) return;
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
    };

    const onPlay = () => {
      setIsPlaying(true);
      if (!played.current) {
        played.current = true;
        void sendPlayback(publicId, "play");
      }
    };

    const onPause = () => setIsPlaying(false);

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      setCurrentTime(audio.currentTime);
      const percent = Math.floor((audio.currentTime / audio.duration) * 100);
      milestones.forEach((milestone) => {
        if (percent >= milestone && !reported.current.has(milestone)) {
          reported.current.add(milestone);
          void sendPlayback(publicId, "progress", milestone);
        }
      });
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [publicId, audioUrl, useShared]);

  const togglePlay = () => {
    if (useShared && playback) {
      playback.playEpisode({ publicId, title, subtitle });
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar || !resolvedDuration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    if (useShared && playback) {
      playback.seek(ratio * resolvedDuration);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ratio * resolvedDuration;
    setCurrentTime(audio.currentTime);
  };

  if (useShared && sharedError) {
    return <div className="text-[13px] text-destructive">{sharedError}</div>;
  }

  if (!useShared && error) {
    return <div className="text-[13px] text-destructive">{error}</div>;
  }

  if (!useShared && !audioUrl) {
    return <div className="text-[13px] text-muted-foreground">Loading audio...</div>;
  }

  return (
    <div className="flex w-full items-center gap-4 text-foreground">
      {useShared ? null : (
        <audio ref={audioRef} src={audioUrl ?? undefined} preload="metadata" className="hidden" />
      )}
      <button
        type="button"
        aria-label={resolvedPlaying ? "Pause audio" : "Play audio"}
        onClick={togglePlay}
        className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {resolvedPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold leading-none">Listen to article</span>
          <span className="text-sm text-muted-foreground">
            {resolvedPlaying || resolvedCurrentTime > 0
              ? `${formatTime(resolvedCurrentTime)} / ${formatTime(resolvedDuration)}`
              : resolvedDuration
                ? formatTime(resolvedDuration)
                : "--:--"}
          </span>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
        {isLoadingShared ? (
          <div className="text-[12px] text-muted-foreground">Loading audio…</div>
        ) : null}
      </div>
    </div>
  );
}
