import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SiteTabs } from "@/app/app/sites/[siteId]/site-tabs";

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

  const favicon = site.domain ? `https://${site.domain}/favicon.ico` : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link href="/app" className="text-[12px] font-medium text-muted-foreground">
          ← All shows
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-background text-lg font-semibold text-foreground">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" className="h-6 w-6" />
            ) : (
              site.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{site.name}</h1>
            <p className="text-[13px] text-muted-foreground">Show</p>
          </div>
        </div>
      </div>
      <SiteTabs siteId={siteId} />
      {children}
    </div>
  );
}
