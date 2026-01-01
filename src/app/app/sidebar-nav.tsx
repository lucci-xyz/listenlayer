"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Sites" },
  { href: "/app/episodes", label: "Episodes" },
  { href: "/app/embed", label: "Embed" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/settings", label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const isActive =
          link.href === "/app"
            ? pathname === "/app" || pathname.startsWith("/app/sites")
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
