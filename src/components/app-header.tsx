"use client";

import { usePathname } from "next/navigation";

const titleMap: Array<{ match: RegExp; title: string }> = [
  { match: /^\/app$/, title: "Overview" },
  { match: /^\/app\/onboarding/, title: "New show" },
  { match: /^\/app\/episodes(\/|$)/, title: "Episodes" },
  { match: /^\/app\/embed/, title: "Player" },
  { match: /^\/app\/analytics/, title: "Analytics" },
  { match: /^\/app\/settings/, title: "Settings" },
  { match: /^\/app\/sites\/[^/]+\/sources/, title: "Sources" },
  { match: /^\/app\/sites\/[^/]+\/style/, title: "Style" },
  { match: /^\/app\/sites\/[^/]+\/episodes/, title: "Episodes" },
  { match: /^\/app\/sites\/[^/]+/, title: "Show" },
];

export function AppHeader() {
  const pathname = usePathname();
  const matched = titleMap.find((entry) => entry.match.test(pathname));
  const title = matched?.title ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/90 px-6 py-4 backdrop-blur-sm lg:px-8">
      <div className="text-[15px] font-medium text-foreground">{title}</div>
    </header>
  );
}
