import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { DeleteFeedDialog } from "@/components/delete-feed-dialog";
import { getPlanFromPriceId, PLANS } from "@/lib/stripe";
import { SettingsUpgradeSection } from "@/components/settings-upgrade-section";
import { SignOutButton } from "@/components/sign-out-button";
import { User, CreditCard, Rss, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const feeds = await prisma.feed.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const currentPlan = getPlanFromPriceId(user.subscriptionPriceId ?? null);
  const plan = PLANS[currentPlan];
  const isFreePlan = currentPlan === "free";

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Page title */}
      <div className="border-b border-border/60 pb-6">
        <h1 className="font-display text-4xl text-foreground">Settings</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Account & Plan Grid */}
      <div className="space-y-8">
        {/* Account Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Account
          </h2>
          <div className="bg-card rounded-2xl border border-border/60 p-8 shadow-soft">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {user.email}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Current Plan</label>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  {plan.name}
                  <Badge variant={isFreePlan ? "secondary" : "success"} className="ml-2 rounded-full">
                    {isFreePlan ? "Free" : "Active"}
                  </Badge>
                </div>
              </div>
            </div>
              <div className="mt-6 border-t border-border/40 pt-6">
              <SignOutButton />
            </div>
          </div>
        </div>

        {/* Subscription & Usage */}
        <div className="space-y-4">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            Subscription
          </h2>
          <div className="bg-card rounded-2xl border border-border/60 p-8 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border/60">
              <div>
                <div className="text-2xl font-display text-foreground">{plan.name}</div>
                <div className="text-muted-foreground mt-1">{plan.description}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-display text-foreground">
                  {plan.price === 0 ? "$0" : `$${plan.price}`}
                </div>
                <div className="text-sm text-muted-foreground">/month</div>
              </div>
            </div>
            
            <div className="py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Episode Credits</div>
                  <div className="text-sm text-muted-foreground">
                    {user.episodeCredits} remaining this month
                  </div>
                </div>
              </div>
              {!isFreePlan && (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/app/settings/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Billing
                  </Link>
                </Button>
              )}
            </div>

            {/* Upgrade CTA for free users - now opens modal */}
            <SettingsUpgradeSection currentPlan={currentPlan} />
          </div>
        </div>

        {/* Managed Feeds */}
        {feeds.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium flex items-center gap-2">
              <Rss className="h-5 w-5 text-muted-foreground" />
              Manage Feeds
            </h2>
            <div className="bg-card rounded-2xl border border-border/60 shadow-soft overflow-hidden">
              <div className="divide-y divide-border/40">
                {feeds.map((feed) => (
                  <div key={feed.id} className="flex items-center justify-between p-6 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Rss className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{feed.name}</div>
                        <div className="text-sm text-muted-foreground max-w-[200px] sm:max-w-md truncate">
                          {feed.feedUrl}
                        </div>
                      </div>
                    </div>
                    <DeleteFeedDialog feedId={feed.id} feedName={feed.name} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
