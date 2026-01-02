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
  { href: "/app/embed", label: "Embed preview", icon: SquarePlay },
  { href: "/app/analytics", label: "Analytics", icon: LineChart },
  { href: "/app/settings", label: "Settings", icon: SlidersHorizontal },
];

const publicationSwatches = [
  "from-rose-500 to-orange-400",
  "from-indigo-500 to-sky-400",
  "from-emerald-500 to-lime-400",
  "from-amber-500 to-rose-400",
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
                "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <span>Publications</span>
          <Button asChild size="icon-sm" variant="ghost">
            <Link href="/app/onboarding" aria-label="Add publication">
              +
            </Link>
          </Button>
        </div>
        <div className="space-y-1">
          {publications.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
              No publications yet.
            </div>
          ) : (
            publications.map((publication, index) => {
              const isActive = pathname.startsWith(`/app/sites/${publication.id}`);
              const swatch = publicationSwatches[index % publicationSwatches.length];
              return (
                <Link
                  key={publication.id}
                  href={`/app/sites/${publication.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  >
                    <div
                      className={cn(
                        "h-6 w-6 rounded-md bg-gradient-to-br",
                        swatch
                      )}
                    />
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
