"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLANS, stripePublishableKey, type PlanKey } from "@/lib/stripe";

// Initialize Stripe outside component to avoid recreating on each render
const stripePromise = stripePublishableKey
  ? loadStripe(stripePublishableKey)
  : null;

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planKey: PlanKey;
  onSuccess?: () => void;
}

export function CheckoutModal({
  open,
  onOpenChange,
  planKey,
  onSuccess,
}: CheckoutModalProps) {
  const plan = PLANS[planKey];
  const priceId = plan.priceId;
  const [isCheckoutReady, setIsCheckoutReady] = useState(false);
  const checkoutContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchClientSecret = useCallback(async () => {
    if (!priceId) {
      throw new Error("No price ID for this plan");
    }

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to create checkout session");
    }

    const data = await res.json();
    return data.clientSecret;
  }, [priceId]);

  const handleComplete = useCallback(async () => {
    try {
      await fetch("/api/billing/sync", { method: "POST" });
    } catch (error) {
      console.error("Billing sync failed:", error);
    }

    // Stripe embedded checkout will redirect to return_url on success
    // This callback fires when the checkout is complete
    onSuccess?.();
  }, [onSuccess]);

  useEffect(() => {
    if (!open) {
      setIsCheckoutReady(false);
      return;
    }

    let isActive = true;

    const intervalId = window.setInterval(() => {
      if (!isActive) {
        return;
      }
      const iframe = document.querySelector(
        "iframe[src*='embedded-checkout']"
      );
      if (iframe) {
        setIsCheckoutReady(true);
        window.clearInterval(intervalId);
      }
    }, 200);

    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setIsCheckoutReady(true);
      }
    }, 8000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [open]);

  // Check if we're in test mode
  const isTestMode =
    process.env.NEXT_PUBLIC_TEST_STRIPE_PAYMENTS === "true";
  const testSuffix = isTestMode ? "_TEST" : "";

  // Show configuration message if no price ID or no Stripe key
  if (!priceId || !stripePromise) {
    const envVarName = `NEXT_PUBLIC_STRIPE_${planKey.toUpperCase()}_PRICE_ID${testSuffix}`;
    const keyVarName = `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY${testSuffix}`;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              Subscribe to {plan.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              Stripe is not configured{isTestMode ? " (test mode)" : ""}.
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Missing environment variables:
            </p>
            <div className="space-y-1 text-sm">
              {!stripePublishableKey && (
                <code className="block bg-secondary px-2 py-1 rounded text-xs">{keyVarName}</code>
              )}
              {!priceId && (
                <code className="block bg-secondary px-2 py-1 rounded text-xs">{envVarName}</code>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Add these to your .env file, then restart the dev server.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-4 sm:p-6 bg-card shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-border/70">
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Checkout</DialogTitle>
        <DialogDescription className="sr-only">
          Secure payment checkout form.
        </DialogDescription>
        <div
          ref={checkoutContainerRef}
          className="relative w-full min-h-[620px] bg-background rounded-2xl border border-border/60"
        >
          {!isCheckoutReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse" />
                Loading secure checkout…
              </div>
            </div>
          )}
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              fetchClientSecret,
              onComplete: handleComplete,
            }}
          >
            <EmbeddedCheckout className="w-full min-h-[620px]" />
          </EmbeddedCheckoutProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
