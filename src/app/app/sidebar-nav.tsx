"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  LayoutGrid,
  LineChart,
  SlidersHorizontal,
  SquarePlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/app", label: "Overview", icon: LayoutGrid },
  { href: "/app/episodes", label: "Episodes", icon: AudioLines },
  { href: "/app/embed", label: "Player", icon: SquarePlay },
  { href: "/app/analytics", label: "Analytics", icon: LineChart },
  { href: "/app/settings", label: "Settings", icon: SlidersHorizontal },
];

export type SidebarPublication = {
  id: string;
  name: string;
};

export function SidebarNav({ publications }: { publications: SidebarPublication[] }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="space-y-1">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/app"
              ? pathname === "/app" || pathname.startsWith("/app/sites")
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] font-normal transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2 text-[12px] font-medium text-muted-foreground">
          <span>Shows</span>
          <Button asChild size="icon-sm" variant="ghost">
            <Link href="/app/onboarding" aria-label="Add show">
              +
            </Link>
          </Button>
        </div>
        <div className="space-y-1">
          {publications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-[12px] text-muted-foreground">
              No shows yet.
            </div>
          ) : (
            publications.map((publication) => {
              const isActive = pathname.startsWith(`/app/sites/${publication.id}`);
              return (
                <Link
                  key={publication.id}
                  href={`/app/sites/${publication.id}`}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] font-normal transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background text-[11px] font-medium text-foreground">
                      {publication.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate">{publication.name}</span>
                  </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
