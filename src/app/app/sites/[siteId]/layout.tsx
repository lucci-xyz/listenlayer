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
        <Link href="/app" className="text-xs uppercase tracking-widest text-zinc-400">
          ← All workspaces
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-lg font-semibold text-zinc-700">
            {favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" className="h-6 w-6" />
            ) : (
              site.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{site.name}</h1>
            <p className="text-sm text-zinc-500">Workspace</p>
          </div>
        </div>
      </div>
      <SiteTabs siteId={siteId} />
      {children}
    </div>
  );
}
