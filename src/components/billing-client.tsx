"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { Check, CreditCard, Loader2, Zap } from "lucide-react";

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
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string) => {
    setLoading(priceId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
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
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{plan.name}</span>
                {user.subscriptionStatus === "ACTIVE" && (
                  <Badge variant="default" className="bg-success text-success-foreground">
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
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
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

      {/* Upgrade Options */}
      {currentPlan !== "pro" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade your plan</CardTitle>
            <CardDescription>
              Get more episodes and features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {(["starter", "pro"] as const)
                .filter((key) => key !== currentPlan)
                .map((key) => {
                  const planOption = PLANS[key];
                  const priceId = planOption.priceId;
                  const isCurrentHigherTier =
                    currentPlan === "starter" && key === "starter";

                  if (isCurrentHigherTier || !priceId) return null;

                  return (
                    <div
                      key={key}
                      className="relative rounded-lg border border-border p-4"
                    >
                      {key === "starter" && (
                        <Badge
                          className="absolute -top-2 right-4"
                          variant="default"
                        >
                          Popular
                        </Badge>
                      )}
                      <div className="mb-4">
                        <h3 className="font-semibold">{planOption.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {planOption.description}
                        </p>
                        <div className="mt-2">
                          <span className="text-2xl font-bold">
                            ${planOption.price}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                      </div>
                      <ul className="mb-4 space-y-2">
                        {planOption.features.slice(0, 4).map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        onClick={() => handleCheckout(priceId)}
                        disabled={loading === priceId}
                      >
                        {loading === priceId ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {currentPlan === "free" ? "Start free trial" : "Upgrade"}
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
