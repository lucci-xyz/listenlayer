import Stripe from "stripe";

// Stripe client - will be null if not configured
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null;

// Plan configurations
export const PLANS = {
  free: {
    name: "Free",
    description: "Perfect for trying out ListenLayer",
    priceId: null,
    price: 0,
    features: [
      "3 audio episodes",
      "Basic player embed",
      "7-day analytics",
    ],
    limits: {
      episodesPerMonth: 3,
      shows: 1,
    },
  },
  starter: {
    name: "Starter",
    description: "For individual creators",
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    price: 19,
    features: [
      "25 episodes / month",
      "Up to 3 shows",
      "Custom player styling",
      "30-day analytics",
      "Priority support",
    ],
    limits: {
      episodesPerMonth: 25,
      shows: 3,
    },
  },
  pro: {
    name: "Pro",
    description: "For growing publishers",
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    price: 49,
    features: [
      "100 episodes / month",
      "Unlimited shows",
      "White-label player",
      "90-day analytics",
      "API access",
      "Dedicated support",
    ],
    limits: {
      episodesPerMonth: 100,
      shows: -1, // unlimited
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanFromPriceId(priceId: string | null): PlanKey {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

export function getPlanLimits(priceId: string | null) {
  const plan = getPlanFromPriceId(priceId);
  return PLANS[plan].limits;
}
