import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/app/app/sidebar-nav";
import { GenerationStatus } from "@/components/generation-status";
import { AppHeader } from "@/components/app-header";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const publications = await prisma.site.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full flex-col border-b border-border bg-card px-5 py-6 lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
              L
            </div>
            <div>
              <div className="text-[15px] font-semibold">ListenLayer</div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Pilot
              </p>
            </div>
          </div>
          <div className="mt-8">
            <SidebarNav publications={publications} />
          </div>
          <div className="mt-auto space-y-3">
            <div className="rounded-xl border border-border bg-white p-3 shadow-soft">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Signed in
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[13px] font-semibold text-foreground">
                  {user.email?.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-foreground">
                    {user.email}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Publication owner
                  </div>
                </div>
              </div>
            </div>
            {process.env.DEV_AUTH_BYPASS === "true" ? null : <SignOutButton />}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 px-5 py-6 lg:px-8">
            <GenerationStatus />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
