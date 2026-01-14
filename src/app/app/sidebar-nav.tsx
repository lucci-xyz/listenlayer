"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  LayoutGrid,
  Plus,
  Rss,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const workspaceLinks = [
  { href: "/app", label: "Dashboard", icon: LayoutGrid },
  { href: "/app/episodes", label: "Episodes", icon: AudioLines },
  { href: "/app/feeds", label: "Feeds", icon: Rss },
];

export type SidebarFeed = {
  id: string;
  name: string;
};

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutGrid }) {
  const pathname = usePathname();
  // For "/app" and "/app/feeds", only be active on exact match
  // This prevents double-highlighting when on a specific feed page
  const isActive = href === "/app" || href === "/app/feeds"
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
        isActive
          ? "bg-muted font-medium text-foreground sidebar-active"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
      {children}
    </div>
  );
}

export function SidebarNav({ feeds }: { feeds: SidebarFeed[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      {/* Main navigation */}
      <div>
        <SectionLabel>Menu</SectionLabel>
        <nav className="flex flex-col gap-0.5">
          {workspaceLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </div>

      {/* Feed subscriptions section */}
      {feeds.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Subscriptions
            </span>
            <Button asChild size="icon" variant="ghost" className="h-5 w-5">
              <Link href="/app/feeds/new" aria-label="Add feed">
                <Plus className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-0.5">
            {feeds.map((feed) => {
              const isActive = pathname.startsWith(`/app/feeds/${feed.id}`);
              return (
                <Link
                  key={feed.id}
                  href={`/app/feeds/${feed.id}`}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground sidebar-active"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Rss className="h-4 w-4 shrink-0" />
                  <span className="truncate">{feed.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
