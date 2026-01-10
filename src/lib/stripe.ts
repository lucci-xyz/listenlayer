import Stripe from "stripe";

// Stripe client - will be null if not configured
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null;

// Support both the older starter/pro env names and the newer creator/pro aliases.
const CREATOR_PRICE_ID =
  process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID || process.env.STRIPE_STARTER_PRICE_ID;
const PRO_PRICE_ID = process.env.STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID;
const BUSINESS_PRICE_ID =
  process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || process.env.STRIPE_BUSINESS_PRICE_ID;

// Plan configurations
export const PLANS = {
  free: {
    name: "Free",
    description: "Try ListenLayer with a few episodes",
    priceId: null,
    price: 0,
    features: [
      "3 episodes / month",
      "1 show",
      "Basic player embed",
      "7-day analytics",
    ],
    limits: {
      episodesPerMonth: 3,
      shows: 1,
    },
  },
  creator: {
    name: "Creator",
    description: "For individual writers and newsletter authors",
    priceId: CREATOR_PRICE_ID,
    price: 15,
    features: [
      "25 episodes / month",
      "Up to 3 shows",
      "Custom player styling",
      "30-day analytics",
      "Email support",
    ],
    limits: {
      episodesPerMonth: 25,
      shows: 3,
    },
  },
  pro: {
    name: "Pro",
    description: "For growing publications",
    priceId: PRO_PRICE_ID,
    price: 49,
    features: [
      "120 episodes / month",
      "Unlimited shows",
      "White-label player",
      "90-day analytics",
      "API access",
      "Priority support",
    ],
    limits: {
      episodesPerMonth: 120,
      shows: -1, // unlimited
    },
  },
  business: {
    name: "Business",
    description: "For teams with higher volume and custom needs",
    priceId: BUSINESS_PRICE_ID,
    price: 149,
    features: [
      "500 episodes / month",
      "Unlimited shows",
      "Custom domain & player",
      "180-day analytics",
      "SSO & SLA",
      "Priority support",
    ],
    limits: {
      episodesPerMonth: 500,
      shows: -1,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanFromPriceId(priceId: string | null): PlanKey {
  if (!priceId) return "free";
  if (priceId === CREATOR_PRICE_ID) return "creator";
  if (priceId === PRO_PRICE_ID) return "pro";
  if (priceId === BUSINESS_PRICE_ID) return "business";
  return "free";
}

export function getPlanLimits(priceId: string | null) {
  const plan = getPlanFromPriceId(priceId);
  return PLANS[plan].limits;
}
