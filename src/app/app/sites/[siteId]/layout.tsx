import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteTabs } from "@/app/app/sites/[siteId]/site-tabs";
import { ProjectAvatar } from "@/components/project-avatar";

export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: user.id },
  });

  if (!site) {
    redirect("/app");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/app"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <ProjectAvatar name={site.name} size={44} className="rounded-xl" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">{site.name}</h1>
          {site.domain && (
            <p className="text-xs text-muted-foreground">{site.domain}</p>
          )}
        </div>
      </div>

      <SiteTabs siteId={siteId} />
      {children}
    </div>
  );
}
