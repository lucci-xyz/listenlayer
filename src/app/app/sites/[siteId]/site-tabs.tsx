"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabItems = [
  { key: "overview", label: "Overview", path: "" },
  { key: "sources", label: "Sources", path: "sources" },
  { key: "style", label: "Style", path: "style" },
  { key: "episodes", label: "Episodes", path: "episodes" },
];

export function SiteTabs({ siteId }: { siteId: string }) {
  const pathname = usePathname();
  const active = tabItems.find((item) =>
    item.path ? pathname.includes(`/sites/${siteId}/${item.path}`) : pathname.endsWith(`/sites/${siteId}`)
  );

  return (
    <Tabs value={active?.key || "overview"} className="w-full">
      <TabsList>
        {tabItems.map((item) => (
          <TabsTrigger key={item.key} value={item.key} asChild>
            <Link href={`/app/sites/${siteId}${item.path ? `/${item.path}` : ""}`}>
              {item.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
