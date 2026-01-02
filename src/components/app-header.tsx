"use client";

import { Bell, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const titleMap: Array<{ match: RegExp; title: string }> = [
  { match: /^\/app$/, title: "Overview" },
  { match: /^\/app\/onboarding/, title: "Create audio" },
  { match: /^\/app\/episodes(\/|$)/, title: "Episodes" },
  { match: /^\/app\/embed/, title: "Embed preview" },
  { match: /^\/app\/analytics/, title: "Analytics" },
  { match: /^\/app\/settings/, title: "Settings" },
  { match: /^\/app\/sites\/[^/]+\/sources/, title: "Sources" },
  { match: /^\/app\/sites\/[^/]+\/style/, title: "Style" },
  { match: /^\/app\/sites\/[^/]+\/episodes/, title: "Episodes" },
  { match: /^\/app\/sites\/[^/]+/, title: "Publication" },
];

export function AppHeader() {
  const pathname = usePathname();
  const matched = titleMap.find((entry) => entry.match.test(pathname));
  const title = matched?.title ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white/80 px-5 py-4 backdrop-blur-sm lg:px-8">
      <div className="text-[15px] font-semibold text-foreground">{title}</div>
      <div className="flex items-center gap-2">
        <Button size="icon-sm" variant="ghost" aria-label="Search">
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Notifications">
          <Bell className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
