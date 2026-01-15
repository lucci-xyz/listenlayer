import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPlanFromPriceId } from "@/lib/stripe";
import { BillingClient } from "@/components/billing-client";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const currentPlan = getPlanFromPriceId(user.subscriptionPriceId ?? null);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      {/* Page title */}
      <div className="border-b border-border pb-6">
        <h1 className="font-display text-4xl text-foreground">Billing</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Billing content */}
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
    </div>
  );
}
