"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ChartEpisode = {
  id: string;
  title: string;
  playCount: number;
};

export function EpisodePlaysChart({ episodes }: { episodes: ChartEpisode[] }) {
  const maxPlays = useMemo(() => {
    return Math.max(...episodes.map((e) => e.playCount), 1);
  }, [episodes]);

  // We want to show exactly 12 bars (slots)
  // Fill from right to left with actual data
  const totalSlots = 12;
  const recentEpisodes = episodes.slice(0, totalSlots).reverse(); // Oldest to newest of the recent ones
  
  // Pad the start with nulls to make 12 items
  const slots = [
    ...Array(totalSlots - recentEpisodes.length).fill(null),
    ...recentEpisodes
  ];

  return (
    <div className="flex h-32 w-full items-end justify-between gap-3">
      <TooltipProvider>
        {slots.map((episode, i) => {
          if (!episode) {
            // Empty slot visual
            return (
              <div 
                key={`empty-${i}`} 
                className="w-full h-full flex items-end"
              >
                <div 
                  className="w-full rounded-full bg-muted/60" 
                  style={{ height: "4px" }} 
                />
              </div>
            );
          }

          // Calculate height as percentage of max, with a min height of 10%
          const heightPercentage = Math.max((episode.playCount / maxPlays) * 100, 10);
          
          return (
            <Tooltip key={episode.id}>
              <TooltipTrigger asChild>
                <div className="w-full h-full flex items-end group cursor-pointer relative">
                  {/* Background track for hover effect */}
                  <div className="absolute bottom-0 w-full h-full rounded-full bg-muted/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
                  
                  {/* The actual bar */}
                  <div
                    className="w-full rounded-full bg-primary/25 transition-all duration-300 group-hover:bg-primary/70 group-hover:scale-y-105 origin-bottom"
                    style={{ height: `${heightPercentage}%` }}
                  >
                    <span className="sr-only">
                      {episode.title}: {episode.playCount} plays
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-center">
                <p className="font-medium">{episode.title}</p>
                <p className="text-xs text-muted-foreground">{episode.playCount} plays</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
