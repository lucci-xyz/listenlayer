import { NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Billing not configured" },
        { status: 503 }
      );
    }

    const user = await requireUser();
    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "Price ID required" }, { status: 400 });
    }

    // Validate price ID against configured plans (handles test mode)
    const validPriceIds = Object.values(PLANS)
      .map((plan) => plan.priceId)
      .filter(Boolean);

    console.log("Checkout debug:", {
      receivedPriceId: priceId,
      validPriceIds,
      isTestMode: process.env.TEST_STRIPE_PAYMENTS,
    });

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: "Invalid price ID", received: priceId, valid: validPriceIds },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session with embedded mode
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      ui_mode: "embedded",
      payment_method_types: ["card", "us_bank_account"],
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      return_url: `${process.env.NEXTAUTH_URL}/app?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: user.id,
      },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 500 }
    );
  }
}
