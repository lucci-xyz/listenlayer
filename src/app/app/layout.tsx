import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/app/app/sidebar-nav";
import { GenerationStatus } from "@/components/generation-status";
import { getPlanFromPriceId, PLANS } from "@/lib/stripe";
import { ChevronDown } from "lucide-react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const feeds = await prisma.feed.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  const currentPlan = getPlanFromPriceId(user.subscriptionPriceId ?? null);
  const plan = PLANS[currentPlan];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <div className="flex h-screen">
        {/* Sidebar - Transparent on sage background */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col py-8 px-6">
          {/* Logo */}
          <div className="mb-10 px-3">
            <Link href="/app" className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-foreground">ListenLayer.</span>
            </Link>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-1">
            <SidebarNav feeds={feeds} />
          </div>
          
          {/* User section at bottom */}
          <div className="mt-auto pt-6 px-1">
            <Link 
              href="/app/settings"
              className="group flex items-center gap-3 rounded-xl p-2 hover:bg-white/20 transition-all duration-200"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-foreground text-xs font-medium shadow-sm ring-2 ring-white/50 group-hover:scale-105 transition-transform">
                {user.email?.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium opacity-90 group-hover:opacity-100">{user.name || user.email?.split('@')[0]}</div>
              </div>
              <ChevronDown className="h-4 w-4 opacity-40 group-hover:opacity-80 transition-opacity" />
            </Link>
            {process.env.DEV_AUTH_BYPASS === "true" ? null : <div className="mt-2"><SignOutButton /></div>}
          </div>
        </aside>

        {/* Main content - White sheet layout with rounded corners on left only */}
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          <div className="flex-1 bg-card rounded-l-[2.5rem] shadow-sm overflow-hidden flex flex-col relative">
            <GenerationStatus />
            <main className="flex-1 overflow-y-auto p-8 lg:px-14 lg:py-10 scroll-smooth">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
