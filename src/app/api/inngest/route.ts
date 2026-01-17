import { serve } from "inngest/next";
import { functions, inngest } from "@/lib/inngest";

export const runtime = "nodejs";

// Configure Inngest with signing key for production webhook verification
// The signing key verifies that incoming webhooks are from Inngest
// Required for production security - prevents unauthorized event triggers
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  // Only require signing key in production
  ...(process.env.NODE_ENV === "production" && process.env.INNGEST_SIGNING_KEY
    ? { signingKey: process.env.INNGEST_SIGNING_KEY }
    : {}),
});
