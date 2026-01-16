import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/app/app/sidebar-nav";
import { GenerationStatus } from "@/components/generation-status";
import { getPlanFromPriceId, PLANS } from "@/lib/stripe";
import { AudioLines, Home, Radio, User } from "lucide-react";

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

  const mobileNav = [
    { href: "/app", label: "Overview", icon: Home },
    { href: "/app/episodes", label: "Episodes", icon: AudioLines },
    { href: "/app/feeds", label: "Feeds", icon: Radio },
    { href: "/app/settings", label: "Account", icon: User },
  ];

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      <div className="flex h-screen">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar px-6 py-8 h-screen sticky top-0">
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
          <div className="mt-auto pt-6 px-1 border-t border-border/60">
            <Link 
              href="/app/settings"
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-background/70 transition-colors group"
            >
              <User className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="text-sm font-medium opacity-90 group-hover:opacity-100">Account</div>
            </Link>
            {process.env.DEV_AUTH_BYPASS === "true" ? null : <div className="mt-2 px-2"><SignOutButton /></div>}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-background overflow-hidden flex flex-col relative">
            <GenerationStatus />
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10 scroll-smooth">
              <div className="mb-6 lg:hidden">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {mobileNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              {children}
              <p className="mt-10 text-xs text-muted-foreground">
                Legal notice: You are responsible for ensuring you have the rights and permissions
                to use any content you submit, and for complying with applicable copyright laws.
              </p>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
