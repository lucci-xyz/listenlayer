"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AudioPlaybackProvider } from "@/components/audio-playback-provider";
import { GlobalAudioPlayer } from "@/components/global-audio-player";
import { Toaster } from "@/components/ui/sonner";
import { GenerationStatus } from "@/components/generation-status";

export function RootProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showGenerationStatus = pathname.startsWith("/app");
  return (
    <AudioPlaybackProvider>
      {showGenerationStatus ? <GenerationStatus /> : null}
      {children}
      <GlobalAudioPlayer />
      <Toaster />
    </AudioPlaybackProvider>
  );
}
