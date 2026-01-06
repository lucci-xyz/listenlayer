"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  LayoutGrid,
  LineChart,
  Plus,
  Settings,
  SquarePlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const workspaceLinks = [
  { href: "/app", label: "Overview", icon: LayoutGrid },
  { href: "/app/episodes", label: "Episodes", icon: AudioLines },
];

const insightsLinks = [
  { href: "/app/embed", label: "Player", icon: SquarePlay },
  { href: "/app/analytics", label: "Analytics", icon: LineChart },
];

const accountLinks = [
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export type SidebarPublication = {
  id: string;
  name: string;
};

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutGrid }) {
  const pathname = usePathname();
  const isActive = href === "/app"
    ? pathname === "/app" || pathname.startsWith("/app/sites")
    : pathname.startsWith(href);

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

export function SidebarNav({ publications }: { publications: SidebarPublication[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      {/* Workspace section */}
      <div>
        <SectionLabel>Workspace</SectionLabel>
        <nav className="flex flex-col gap-0.5">
          {workspaceLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </div>

      {/* Insights section */}
      <div>
        <SectionLabel>Insights</SectionLabel>
        <nav className="flex flex-col gap-0.5">
          {insightsLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </div>

      {/* Shows section */}
      <div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
            Shows
          </span>
          <Button asChild size="icon" variant="ghost" className="h-5 w-5">
            <Link href="/app/onboarding" aria-label="Add show">
              <Plus className="h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-0.5">
          {publications.length === 0 ? (
            <div className="mx-3 rounded-lg border border-dashed border-border/70 px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">No shows yet</p>
              <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">
                <Link href="/app/onboarding">Create your first →</Link>
              </Button>
            </div>
          ) : (
            publications.map((publication) => {
              const isActive = pathname.startsWith(`/app/sites/${publication.id}`);
              return (
                <Link
                  key={publication.id}
                  href={`/app/sites/${publication.id}`}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-muted font-medium text-foreground sidebar-active"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-semibold text-primary">
                    {publication.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate">{publication.name}</span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Account section */}
      <div className="mt-auto">
        <SectionLabel>Account</SectionLabel>
        <nav className="flex flex-col gap-0.5">
          {accountLinks.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </div>
    </div>
  );
}
