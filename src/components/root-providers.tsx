"use client";

import { type ReactNode } from "react";
import { AudioPlaybackProvider } from "@/components/audio-playback-provider";
import { GlobalAudioPlayer } from "@/components/global-audio-player";
import { Toaster } from "@/components/ui/sonner";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <AudioPlaybackProvider>
      {children}
      <GlobalAudioPlayer />
      <Toaster />
    </AudioPlaybackProvider>
  );
}
