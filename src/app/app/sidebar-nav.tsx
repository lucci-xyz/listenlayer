"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  AudioLines,
  Rss,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Overview", icon: Home },
  { href: "/app/episodes", label: "Episodes", icon: AudioLines },
  { href: "/app/feeds", label: "Feeds", icon: Rss },
];

export type SidebarFeed = {
  id: string;
  name: string;
};

export function SidebarNav({ feeds }: { feeds: SidebarFeed[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1.5">
      {navItems.map((item) => {
        // Fix: "Feeds" should only be active on exact /app/feeds, not on /app/feeds/[id]
        const isActive = item.href === "/app" 
          ? pathname === "/app"
          : item.href === "/app/feeds"
          ? pathname === "/app/feeds"
          : pathname.startsWith(item.href);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[14px] transition-all duration-200 group",
              isActive
                ? "bg-white text-foreground font-medium shadow-sm ring-1 ring-black/5" // Active pill style
                : "text-foreground/60 hover:text-foreground hover:bg-white/30"
            )}
          >
            <item.icon 
              className={cn(
                "h-[18px] w-[18px] transition-colors", 
                isActive ? "text-foreground" : "text-foreground/60 group-hover:text-foreground"
              )} 
              strokeWidth={1.5} 
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
      
      {/* Feed subscriptions */}
      {feeds.length > 0 && (
        <div className="pt-6 mt-2 space-y-1.5">
          <div className="px-4 pb-2 text-[11px] font-medium text-foreground/40 uppercase tracking-widest">
            Your Feeds
          </div>
          {feeds.map((feed) => {
            const isActive = pathname.startsWith(`/app/feeds/${feed.id}`);
            return (
              <Link
                key={feed.id}
                href={`/app/feeds/${feed.id}`}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-[14px] transition-all duration-200 group",
                  isActive
                    ? "bg-white text-foreground font-medium shadow-sm ring-1 ring-black/5"
                    : "text-foreground/60 hover:text-foreground hover:bg-white/30"
                )}
              >
                <Rss 
                  className={cn(
                    "h-[18px] w-[18px] transition-colors", 
                    isActive ? "text-foreground" : "text-foreground/60 group-hover:text-foreground"
                  )} 
                  strokeWidth={1.5} 
                />
                <span className="truncate">{feed.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
