"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckoutModal } from "@/components/checkout-modal";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { toast } from "sonner";

interface UpgradeModalTriggerProps {
  /** Current user's plan */
  currentPlan: PlanKey;
}

export function UpgradeModalTrigger({ currentPlan }: UpgradeModalTriggerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  useEffect(() => {
    // Check for upgrade param (from login redirect)
    const upgradeParam = searchParams.get("upgrade") as PlanKey | null;
    
    // Check for checkout success
    const checkoutSuccess = searchParams.get("checkout_success");
    const sessionId = searchParams.get("session_id");

    if (checkoutSuccess === "true" && sessionId) {
      void fetch("/api/billing/sync", { method: "POST" }).finally(() => {
        router.refresh();
      });
      // Clear the URL params
      router.replace("/app");
      toast.success("Welcome to your new plan!", {
        description: "Your subscription is now active.",
      });
      return;
    }

    // If there's an upgrade param and it's a valid paid plan
    if (
      upgradeParam &&
      upgradeParam !== "free" &&
      upgradeParam in PLANS
    ) {
      // Don't show modal if user already has this plan or better
      if (currentPlan === "free") {
        setSelectedPlan(upgradeParam);
        setModalOpen(true);
        // Clear the URL param
        router.replace("/app");
      }
    }
  }, [searchParams, router, currentPlan]);

  const handleOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedPlan(null);
    }
  };

  const handleCheckoutSuccess = () => {
    setModalOpen(false);
    setSelectedPlan(null);
    toast.success("Welcome to your new plan!", {
      description: "Your subscription is now active.",
    });
    router.refresh();
  };

  if (!selectedPlan) {
    return null;
  }

  return (
    <CheckoutModal
      open={modalOpen}
      onOpenChange={handleOpenChange}
      planKey={selectedPlan}
      onSuccess={handleCheckoutSuccess}
    />
  );
}
