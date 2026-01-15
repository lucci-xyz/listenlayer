"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const milestones = [25, 50, 75, 100];

type EpisodeMeta = {
  publicId: string;
  title?: string;
  subtitle?: string;
};

type PlaybackState = {
  publicId: string | null;
  title: string;
  subtitle: string;
  audioUrl: string | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  loading: boolean;
  error: string | null;
};

type PlaybackContextValue = {
  state: PlaybackState;
  playEpisode: (meta: EpisodeMeta) => void;
  toggle: () => void;
  pause: () => void;
  seek: (time: number) => void;
  close: () => void;
};

const AudioPlaybackContext = createContext<PlaybackContextValue | null>(null);

async function sendPlayback(publicId: string, kind: "play" | "progress", value?: number) {
  await fetch("/api/analytics/playback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, kind, value }),
  });
}

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoPlay = useRef(false);
  const reported = useRef<Set<number>>(new Set());
  const played = useRef(false);

  const [state, setState] = useState<PlaybackState>({
    publicId: null,
    title: "",
    subtitle: "",
    audioUrl: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    loading: false,
    error: null,
  });

  const loadAudio = useCallback(async (publicId: string) => {
    try {
      const res = await fetch(`/api/episodes/${publicId}/audio-url`);
      if (!res.ok) {
        throw new Error("Failed to load audio");
      }
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        audioUrl: data.url,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load audio",
      }));
    }
  }, []);

  const playEpisode = useCallback(
    (meta: EpisodeMeta) => {
      const audio = audioRef.current;
      if (state.publicId === meta.publicId && audio && state.audioUrl) {
        if (audio.paused) {
          void audio.play();
        } else {
          audio.pause();
        }
        return;
      }

      reported.current = new Set();
      played.current = false;
      shouldAutoPlay.current = true;

      setState((prev) => ({
        ...prev,
        publicId: meta.publicId,
        title: meta.title || "Untitled audio",
        subtitle: meta.subtitle || "",
        audioUrl: null,
        currentTime: 0,
        duration: 0,
        loading: true,
        error: null,
      }));

      void loadAudio(meta.publicId);
    },
    [loadAudio, state.audioUrl, state.publicId]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(time)) return;
    audio.currentTime = time;
    setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setState({
      publicId: null,
      title: "",
      subtitle: "",
      audioUrl: null,
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration || 0,
      }));
    };

    const onPlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
      if (state.publicId && !played.current) {
        played.current = true;
        void sendPlayback(state.publicId, "play");
      }
    };

    const onPause = () => setState((prev) => ({ ...prev, isPlaying: false }));

    const onTimeUpdate = () => {
      if (!audio.duration || !state.publicId) return;
      setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
      const percent = Math.floor((audio.currentTime / audio.duration) * 100);
      milestones.forEach((milestone) => {
        if (percent >= milestone && !reported.current.has(milestone)) {
          reported.current.add(milestone);
          void sendPlayback(state.publicId as string, "progress", milestone);
        }
      });
    };

    const onEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
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
  }, [state.publicId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !state.audioUrl) return;

    if (shouldAutoPlay.current) {
      shouldAutoPlay.current = false;
      void audio.play();
    }
  }, [state.audioUrl]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      state,
      playEpisode,
      toggle,
      pause,
      seek,
      close,
    }),
    [close, pause, playEpisode, seek, state, toggle]
  );

  return (
    <AudioPlaybackContext.Provider value={value}>
      {children}
      <audio ref={audioRef} src={state.audioUrl ?? undefined} preload="metadata" className="hidden" />
    </AudioPlaybackContext.Provider>
  );
}

export function useAudioPlayback() {
  return useContext(AudioPlaybackContext);
}
