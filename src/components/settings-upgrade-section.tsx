"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckoutModal } from "@/components/checkout-modal";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";

interface SettingsUpgradeSectionProps {
  currentPlan: PlanKey;
}

export function SettingsUpgradeSection({ currentPlan }: SettingsUpgradeSectionProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [didAttemptSync, setDidAttemptSync] = useState(false);

  if (currentPlan !== "free") {
    return null;
  }

  useEffect(() => {
    if (didAttemptSync) {
      return;
    }

    setDidAttemptSync(true);

    void fetch("/api/billing/sync", { method: "POST" }).then((res) => {
      if (res.ok) {
        router.refresh();
      }
    });
  }, [didAttemptSync, router]);

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

  const planOptions: PlanKey[] = ["creator", "pro", "business"];

  return (
    <>
      <div className="pt-6 border-t border-border/40">
        <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-foreground">Unlock more features</div>
              <div className="text-sm text-muted-foreground">
                Get more episodes, advanced analytics, and custom branding
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {planOptions.map((key) => {
              const plan = PLANS[key];
              const isPopular = key === "creator";

              return (
                <div
                  key={key}
                  className={`relative flex flex-col p-5 rounded-xl border transition-all ${
                    isPopular
                      ? "bg-white border-primary/30 shadow-sm"
                      : "bg-white/60 border-border/50 hover:border-border"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-2.5 left-4 bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full text-xs font-medium">
                      Popular
                    </div>
                  )}

                  <div className="mb-3">
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <div className="mt-1">
                      <span className="text-2xl font-bold text-foreground">
                        ${plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-4 flex-1 text-sm">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={isPopular ? "default" : "outline"}
                    size="sm"
                    className="w-full rounded-full"
                    onClick={() => handleSelectPlan(key)}
                  >
                    Start trial
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedPlan && (
        <CheckoutModal
          open={modalOpen}
          onOpenChange={handleCloseModal}
          planKey={selectedPlan}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </>
  );
}
