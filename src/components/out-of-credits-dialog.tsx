"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckoutModal } from "@/components/checkout-modal";
import { PLANS, type PlanKey } from "@/lib/stripe";

const nextPlanByKey: Record<PlanKey, PlanKey | null> = {
  free: "creator",
  creator: "pro",
  pro: "business",
  business: null,
};

function formatResetLabel(resetDate: Date | null) {
  if (!resetDate) return null;
  return resetDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getDaysLeft(resetDate: Date | null) {
  if (!resetDate) return null;
  const diffMs = resetDate.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function OutOfCreditsDialog({
  open,
  onOpenChange,
  currentPlan,
  resetAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanKey;
  resetAt?: string | null;
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const nextPlan = nextPlanByKey[currentPlan];

  const resetDate = useMemo(() => {
    if (resetAt) {
      const parsed = new Date(resetAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }, [resetAt]);

  const daysLeft = getDaysLeft(resetDate);
  const resetLabel = formatResetLabel(resetDate);
  const dayLabel =
    daysLeft === null ? "" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  const handleUpgrade = () => {
    if (!nextPlan) return;
    onOpenChange(false);
    setCheckoutOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Out of credits</DialogTitle>
            <DialogDescription className="text-base">
              You have no episode credits remaining.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            {daysLeft !== null ? (
              <span>
                Credits reset in {dayLabel}
                {resetLabel ? ` (on ${resetLabel}).` : "."}
              </span>
            ) : (
              <span>Credits reset monthly.</span>
            )}
          </div>

          <DialogFooter className="sm:justify-between gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Not now
            </Button>
            {nextPlan ? (
              <Button onClick={handleUpgrade}>
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to {PLANS[nextPlan].name}
              </Button>
            ) : (
              <Button asChild>
                <Link href="/app/settings/billing">Manage billing</Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {nextPlan ? (
        <CheckoutModal
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          planKey={nextPlan}
          onSuccess={() => setCheckoutOpen(false)}
        />
      ) : null}
    </>
  );
}
