"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutModal } from "@/components/checkout-modal";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { Check, CreditCard, Loader2, Zap, Sparkles } from "lucide-react";

interface BillingClientProps {
  user: {
    email: string;
    subscriptionStatus: string | null;
    subscriptionPriceId: string | null;
    subscriptionCurrentPeriodEnd: Date | null;
    episodeCredits: number;
  };
  currentPlan: PlanKey;
}

export function BillingClient({ user, currentPlan }: BillingClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectPlan = (planKey: PlanKey) => {
    setSelectedPlan(planKey);
    setModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedPlan(null);
    }
  };

  const handleCheckoutSuccess = () => {
    setModalOpen(false);
    setSelectedPlan(null);
    toast.success("You're all set!", {
      description: "Your subscription is now active.",
    });
    router.refresh();
  };

  const handlePortal = async () => {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setLoading(null);
    }
  };

  const plan = PLANS[currentPlan];

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current plan
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{plan.name}</span>
                {user.subscriptionStatus === "ACTIVE" && (
                  <Badge variant="success">
                    Active
                  </Badge>
                )}
                {user.subscriptionStatus === "TRIALING" && (
                  <Badge variant="secondary">Trial</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              {user.subscriptionCurrentPeriodEnd && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {user.subscriptionStatus === "CANCELED"
                    ? "Access until"
                    : "Renews on"}{" "}
                  {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${plan.price}</div>
              <div className="text-sm text-muted-foreground">/month</div>
            </div>
          </div>

          {/* Credits */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="font-medium">Episode credits</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Episodes you can generate this month
              </p>
            </div>
            <div className="text-2xl font-bold">{user.episodeCredits}</div>
          </div>

          {user.subscriptionStatus && user.subscriptionStatus !== "CANCELED" && (
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={loading === "portal"}
            >
              {loading === "portal" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Manage subscription
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options - Always show for free plan */}
      {currentPlan === "free" && (
        <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-transparent shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Upgrade your plan
            </CardTitle>
            <CardDescription>
              Get more episodes and unlock advanced features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {(["creator", "pro", "business"] as PlanKey[]).map((key) => {
                const planOption = PLANS[key];
                const isPopular = key === "creator";

                return (
                  <div
                    key={key}
                    className="relative rounded-xl border border-border/60 bg-card p-5 shadow-sm"
                  >
                    {isPopular && (
                      <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground border-primary/20">
                        Popular
                      </Badge>
                    )}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">{planOption.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {planOption.description}
                      </p>
                      <div className="mt-3">
                        <span className="text-3xl font-bold">
                          ${planOption.price}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>
                    <ul className="mb-5 space-y-2">
                      {planOption.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleSelectPlan(key)}
                      disabled={!planOption.priceId}
                    >
                      {planOption.priceId ? "Start free trial" : "Coming soon"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show targeted upgrade when on a paid tier but not top */}
      {currentPlan === "creator" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade to Pro</CardTitle>
            <CardDescription>
              Get more monthly episodes and white-label options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/60 bg-background p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{PLANS.pro.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {PLANS.pro.description}
                </p>
                <div className="mt-3">
                  <span className="text-3xl font-bold">
                    ${PLANS.pro.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="mb-5 space-y-2">
                {PLANS.pro.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => handleSelectPlan("pro")}
                disabled={!PLANS.pro.priceId}
              >
                {PLANS.pro.priceId ? "Upgrade to Pro" : "Coming soon"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentPlan === "pro" && (
        <Card>
          <CardHeader>
            <CardTitle>Need more volume?</CardTitle>
            <CardDescription>
              Move to Business for higher limits and enterprise support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/60 bg-background p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{PLANS.business.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {PLANS.business.description}
                </p>
                <div className="mt-3">
                  <span className="text-3xl font-bold">
                    ${PLANS.business.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="mb-5 space-y-2">
                {PLANS.business.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => handleSelectPlan("business")}
                disabled={!PLANS.business.priceId}
              >
                {PLANS.business.priceId ? "Upgrade to Business" : "Contact us"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          open={modalOpen}
          onOpenChange={handleCloseModal}
          planKey={selectedPlan}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
