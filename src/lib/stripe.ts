import Stripe from "stripe";

// Use test mode when APP_ENV is "preview" or explicitly set
const explicitTestMode =
  process.env.NEXT_PUBLIC_APP_ENV === "preview" ||
  process.env.TEST_STRIPE_PAYMENTS === "true" ||
  process.env.NEXT_PUBLIC_TEST_STRIPE_PAYMENTS === "true";

const resolveKeyMode = (key?: string) => {
  if (!key) return null;
  if (key.startsWith("sk_test") || key.startsWith("pk_test")) return "test";
  if (key.startsWith("sk_live") || key.startsWith("pk_live")) return "live";
  return null;
};

const pickValue = (mode: "test" | "live", testValue?: string, liveValue?: string) =>
  mode === "test" ? testValue ?? liveValue : liveValue ?? testValue;

const serverSecretKeyCandidate =
  typeof window === "undefined"
    ? explicitTestMode
      ? process.env.STRIPE_SECRET_KEY_TEST ?? process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY_TEST
    : undefined;

const publishableKeyCandidate = explicitTestMode
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST;

const inferredMode =
  resolveKeyMode(serverSecretKeyCandidate) ?? resolveKeyMode(publishableKeyCandidate);

// Check if we're in test mode (works on both server and client)
const isTestMode = inferredMode ? inferredMode === "test" : explicitTestMode;
export const stripeMode = isTestMode ? "test" : "live";

// Debug: Log Stripe mode on server (only logs once at module load)
// Note: Using dynamic import to avoid issues during build
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  import("@/lib/logger").then(({ loggers }) => {
    loggers.stripe.debug({ stripeMode, appEnv: process.env.NEXT_PUBLIC_APP_ENV }, "Stripe mode initialized");
  }).catch(() => {
    // Ignore if logger not available during build
  });
}

// Get the appropriate secret key based on resolved mode
const secretKey =
  typeof window === "undefined"
    ? pickValue(
        stripeMode,
        process.env.STRIPE_SECRET_KEY_TEST,
        process.env.STRIPE_SECRET_KEY
      )
    : undefined;

// Stripe client - will be null if not configured
export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null;

// Get price IDs based on resolved mode
// Note: These need NEXT_PUBLIC_ prefix to be available in client components
const CREATOR_PRICE_ID = pickValue(
  stripeMode,
  process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_TEST,
  process.env.NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID
);

const PRO_PRICE_ID = pickValue(
  stripeMode,
  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_TEST,
  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
);

const BUSINESS_PRICE_ID = pickValue(
  stripeMode,
  process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_TEST,
  process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID
);

// Export publishable key for client-side Stripe initialization
export const stripePublishableKey = pickValue(
  stripeMode,
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST,
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

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
