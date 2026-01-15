"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutModal } from "@/components/checkout-modal";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { Check, Sparkles } from "lucide-react";

interface PricingPageClientProps {
  currentPlan: PlanKey;
}

export function PricingPageClient({ currentPlan }: PricingPageClientProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSelectPlan = (planKey: PlanKey) => {
    if (planKey === "free" || planKey === currentPlan) {
      return;
    }
    setSelectedPlan(planKey);
    setModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setSelectedPlan(null);
    }
  };

  const getButtonLabel = (planKey: PlanKey) => {
    if (planKey === currentPlan) {
      return "Current plan";
    }
    if (planKey === "free") {
      return "Free tier";
    }
    return currentPlan === "free" ? "Start free trial" : "Upgrade";
  };

  const planKeys: PlanKey[] = ["free", "creator", "pro", "business"];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {planKeys.map((key) => {
          const plan = PLANS[key];
          const isPopular = key === "creator";
          const isCurrent = key === currentPlan;

          return (
            <div
              key={key}
              className={`relative flex flex-col p-8 rounded-[2rem] transition-all duration-300 ${
                isPopular
                  ? "bg-primary text-primary-foreground shadow-2xl scale-105 z-10"
                  : isCurrent
                  ? "bg-white ring-2 ring-primary/20 shadow-lg"
                  : "bg-secondary/50 hover:bg-secondary border border-border"
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Popular
                </div>
              )}

              {isCurrent && !isPopular && (
                <Badge className="absolute top-4 right-4 bg-primary/10 text-primary border-0">
                  Current
                </Badge>
              )}

              <div className="mb-4">
                <h3
                  className={`font-semibold text-lg ${
                    isPopular ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    isPopular ? "text-primary-foreground/70" : "text-foreground/60"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <span className="font-display text-4xl">
                  {plan.price === 0 ? "$0" : `$${plan.price}`}
                </span>
                <span
                  className={`text-sm ${
                    isPopular ? "text-primary-foreground/70" : "text-foreground/60"
                  }`}
                >
                  /mo
                </span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        isPopular ? "text-accent" : "text-primary"
                      }`}
                      strokeWidth={2}
                    />
                    <span
                      className={
                        isPopular ? "text-primary-foreground/90" : "text-foreground/80"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={isPopular ? "secondary" : "outline"}
                className={`w-full rounded-full h-12 ${
                  isPopular
                    ? "bg-white text-primary hover:bg-white/90 border-transparent"
                    : isCurrent
                    ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                    : "bg-white border-border hover:bg-white/50"
                }`}
                onClick={() => handleSelectPlan(key)}
                disabled={isCurrent || key === "free"}
              >
                {getButtonLabel(key)}
              </Button>
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <CheckoutModal
          open={modalOpen}
          onOpenChange={handleCloseModal}
          planKey={selectedPlan}
        />
      )}
    </>
  );
}
