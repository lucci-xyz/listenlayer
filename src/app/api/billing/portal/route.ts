import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { isAllowedAppOrigin } from "@/lib/security";
import { loggers, logError } from "@/lib/logger";

const log = loggers.billing;

export async function POST(req: Request) {
  // CSRF protection
  if (!isAllowedAppOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Billing not configured" },
        { status: 503 }
      );
    }

    const stripeClient = stripe;
    const user = await requireUser();
    const origin = new URL(req.url).origin;

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const session = await stripeClient.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/app/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logError(log, error, "Portal session creation error");
    return NextResponse.json(
      { error: "Unable to create portal session" },
      { status: 500 }
    );
  }
}
