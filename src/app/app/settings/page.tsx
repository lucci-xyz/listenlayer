import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { DeleteFeedDialog } from "@/components/delete-feed-dialog";
import { getPlanFromPriceId, PLANS } from "@/lib/stripe";
import { BillingClient } from "@/components/billing-client";
import { User, AlertTriangle } from "lucide-react";

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
      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>
            Your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Email</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Plan</div>
              <div className="text-sm text-muted-foreground">{plan.name}</div>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Danger zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for your feed subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {feeds.map((feed) => (
                <AccordionItem key={feed.id} value={feed.id}>
                  <AccordionTrigger className="text-sm">
                    {feed.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm">
                      <div className="text-muted-foreground">
                        Feed URL: {feed.feedUrl}
                      </div>
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-destructive">
                            Delete this feed subscription.
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
