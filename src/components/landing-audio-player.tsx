"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(value: number) {
  if (!isFinite(value)) return "--:--";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function LandingAudioPlayer({
  src,
  endpoint,
  durationLabel,
}: {
  src?: string;
  endpoint?: string;
  durationLabel?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioSrc, setAudioSrc] = useState<string | null>(src ?? null);
  const [loading, setLoading] = useState(Boolean(endpoint && !src));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (src) {
      setAudioSrc(src);
      setLoading(false);
      setError(null);
    }
  }, [src]);

  useEffect(() => {
    if (!endpoint || src) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("Failed to load demo audio");
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("Audio URL unavailable");
        if (active) setAudioSrc(data.url);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load demo audio");
          setAudioSrc(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [endpoint, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
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
  }, []);

  useEffect(() => {
    if (!audioSrc) return;
    setCurrentTime(0);
    setDuration(0);
  }, [audioSrc]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration || !audioSrc) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  const displayDuration = duration
    ? formatTime(duration)
    : durationLabel ?? (loading ? "--:--" : "--:--");
  const isReady = Boolean(audioSrc) && !loading && !error;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-4 shadow-sm">
      <audio ref={audioRef} src={audioSrc ?? undefined} preload="metadata" className="hidden" />
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={isPlaying ? "Pause sample audio" : "Play sample audio"}
          onClick={togglePlay}
          disabled={!isReady}
          className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{displayDuration}</span>
          </div>
          <div
            ref={barRef}
            className="relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-border/60"
            onClick={handleSeek}
            aria-label="Seek"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          {error ? (
            <div className="text-[11px] text-destructive">{error}</div>
          ) : loading ? (
            <div className="text-[11px] text-muted-foreground">Loading audio…</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
