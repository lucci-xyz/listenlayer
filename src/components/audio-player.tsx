"use client";

import { useEffect, useRef, useState } from "react";

const milestones = [25, 50, 75, 100];

async function sendPlayback(publicId: string, kind: "play" | "progress", value?: number) {
  await fetch("/api/analytics/playback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, kind, value }),
  });
}

export function AudioPlayer({ publicId }: { publicId: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reported = useRef<Set<number>>(new Set());
  const played = useRef(false);

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

    const onPlay = () => {
      if (!played.current) {
        played.current = true;
        sendPlayback(publicId, "play");
      }
    };

    const onTimeUpdate = () => {
      if (!audio.duration) return;
      const percent = Math.floor((audio.currentTime / audio.duration) * 100);
      milestones.forEach((milestone) => {
        if (percent >= milestone && !reported.current.has(milestone)) {
          reported.current.add(milestone);
          sendPlayback(publicId, "progress", milestone);
        }
      });
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [publicId, audioUrl]);

  if (error) {
    return <div className="text-[13px] text-red-600">{error}</div>;
  }

  if (!audioUrl) {
    return <div className="text-[13px] text-muted-foreground">Loading audio...</div>;
  }

  return <audio ref={audioRef} controls className="w-full" src={audioUrl} />;
}
