"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Pause, Play } from "lucide-react";

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

export function AudioPlayer({ publicId }: { publicId: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const reported = useRef<Set<number>>(new Set());
  const played = useRef(false);

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
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
  }, [publicId]);

  useEffect(() => {
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
  }, [publicId, audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = barRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  if (error) {
    return <div className="text-[13px] text-red-600">{error}</div>;
  }

  if (!audioUrl) {
    return <div className="text-[13px] text-muted-foreground">Loading audio...</div>;
  }

  return (
    <div className="flex w-full items-center gap-4 text-foreground">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
      <button
        type="button"
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        onClick={togglePlay}
        className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/60"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold leading-none">Listen to article</span>
          <span className="text-sm text-muted-foreground">
            {isPlaying || currentTime > 0
              ? `${formatTime(currentTime)} / ${formatTime(duration)}`
              : duration
                ? formatTime(duration)
                : "--:--"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            ref={barRef}
            className="relative h-1 w-full cursor-pointer overflow-hidden rounded-full bg-foreground/15"
            onClick={handleSeek}
            aria-label="Seek"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-foreground"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
