import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPlanFromPriceId } from "@/lib/stripe";
import { PricingPageClient } from "./pricing-client";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const currentPlan = getPlanFromPriceId(user.subscriptionPriceId ?? null);
  const hasActiveSubscription =
    user.subscriptionStatus === "ACTIVE" || user.subscriptionStatus === "TRIALING";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-[1200px] px-6 py-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        {/* Page header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <CreditCard className="h-4 w-4" />
            Pricing
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            {hasActiveSubscription
              ? "Manage your subscription"
              : "Choose your plan"}
          </h1>
          <p className="text-lg text-foreground/60">
            {hasActiveSubscription
              ? "Upgrade or change your plan anytime. All plans include our core features."
              : "Start free and upgrade when you need more. All plans include our embed player and analytics."}
          </p>

          {hasActiveSubscription && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm border border-border">
              <span className="text-sm text-foreground/60">Current plan:</span>
              <Badge variant="default" className="rounded-full">
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </Badge>
              {user.subscriptionCurrentPeriodEnd && (
                <span className="text-sm text-foreground/60">
                  · Renews{" "}
                  {new Date(user.subscriptionCurrentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Pricing cards - client component for modal */}
        <PricingPageClient currentPlan={currentPlan} />

        {/* FAQ or additional info */}
        <div className="mt-20 text-center">
          <p className="text-sm text-foreground/50">
            Questions about billing?{" "}
            <a href="mailto:support@listenlayer.com" className="text-primary hover:underline">
              Contact support
            </a>
          </p>
          {hasActiveSubscription && (
            <p className="text-sm text-foreground/50 mt-2">
              Need to cancel or update payment method?{" "}
              <Link href="/app/settings/billing" className="text-primary hover:underline">
                Manage billing
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
