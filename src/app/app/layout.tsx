import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/app/app/sidebar-nav";
import { GenerationStatus } from "@/components/generation-status";
import { AppHeader } from "@/components/app-header";
import { getPlanFromPriceId, PLANS } from "@/lib/stripe";
import { Zap } from "lucide-react";

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

  const currentPlan = getPlanFromPriceId(user.subscriptionPriceId ?? null);
  const plan = PLANS[currentPlan];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar - fixed height on desktop */}
        <aside className="flex w-full shrink-0 flex-col border-b border-border/70 bg-card px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r lg:py-5">
          {/* Logo + wordmark */}
          <Link href="/app" className="flex items-center gap-2.5 px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-semibold">
              L
            </div>
            <span className="text-[15px] font-medium tracking-tight">ListenLayer</span>
          </Link>
          
          {/* Navigation - scrollable area */}
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
            <SidebarNav publications={publications} />
          </div>
          
          {/* Bottom section - always visible */}
          <div className="mt-4 shrink-0 space-y-3">
            {/* Credits indicator - hero metric style */}
            <div className="rounded-xl border border-border/70 bg-gradient-to-br from-violet-500/5 to-transparent p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-medium text-muted-foreground">Episode credits</span>
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {user.episodeCredits}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {plan.name} plan
              </div>
              {currentPlan === "free" && (
                <Link 
                  href="/app/settings" 
                  className="mt-3 inline-flex items-center text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  Upgrade for more →
                </Link>
              )}
            </div>

            {/* User section - links to settings */}
            <Link 
              href="/app/settings"
              className="group flex items-center gap-3 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {user.email?.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{user.email}</div>
                <div className="text-xs text-muted-foreground">Settings</div>
              </div>
            </Link>
            
            {process.env.DEV_AUTH_BYPASS === "true" ? null : <SignOutButton />}
          </div>
        </aside>

        {/* Main content - scrollable */}
        <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
          <AppHeader />
          <main className="flex-1 px-6 py-6 lg:px-8">
            <GenerationStatus />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
