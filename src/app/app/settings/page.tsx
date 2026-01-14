import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { DeleteFeedDialog } from "@/components/delete-feed-dialog";
import { getPlanFromPriceId, PLANS } from "@/lib/stripe";
import { BillingClient } from "@/components/billing-client";
import { User, AlertTriangle, Mail, CreditCard, Rss } from "lucide-react";

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page title */}
      <div>
        <h1 className="font-display text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <User className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <div className="text-sm font-medium">Plan</div>
                <div className="text-sm text-muted-foreground">{plan.description}</div>
              </div>
            </div>
            <Badge variant={currentPlan === "free" ? "secondary" : "default"}>
              {plan.name}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <BillingClient 
        user={{
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionPriceId: user.subscriptionPriceId,
          subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
          episodeCredits: user.episodeCredits,
        }}
        currentPlan={currentPlan}
      />

      {/* Feeds / Danger Zone */}
      {feeds.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>Irreversible actions for your feed subscriptions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {feeds.map((feed) => (
                <AccordionItem 
                  key={feed.id} 
                  value={feed.id}
                  className="rounded-xl border border-border px-4 data-[state=open]:bg-secondary/30"
                >
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Rss className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      {feed.name}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pb-2 text-sm">
                      <div className="text-muted-foreground break-all">
                        <span className="font-medium text-foreground">Feed URL:</span> {feed.feedUrl}
                      </div>
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-destructive">
                            Permanently delete this feed subscription.
                          </p>
                          <DeleteFeedDialog feedId={feed.id} feedName={feed.name} />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
