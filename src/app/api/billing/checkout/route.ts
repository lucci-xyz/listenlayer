import { NextResponse } from "next/server";
import { stripe, PLANS, stripeMode } from "@/lib/stripe";
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
      stripeMode,
    });

    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: "Invalid price ID", received: priceId, valid: validPriceIds },
        { status: 400 }
      );
    }

    const isMissingCustomerError = (error: unknown) => {
      const err = error as { code?: string; param?: string };
      return err?.code === "resource_missing" && err?.param === "customer";
    };

    const ensureCustomer = async () => {
      let customerId = user.stripeCustomerId;

      if (customerId) {
        try {
          const existing = await stripe.customers.retrieve(customerId);
          if (typeof existing === "object" && "deleted" in existing && existing.deleted) {
            customerId = null;
          }
        } catch (error) {
          if (isMissingCustomerError(error)) {
            customerId = null;
          } else {
            throw error;
          }
        }
      }

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

      return customerId;
    };

    const customerId = await ensureCustomer();

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
    const stripeError = error as {
      code?: string;
      param?: string;
      message?: string;
    };
    if (
      stripeError?.code === "resource_missing" &&
      stripeError?.param === "line_items[0][price]"
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe price not found for the current mode. Check that your Stripe keys and price IDs belong to the same (test or live) account.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Unable to create checkout session" },
      { status: 500 }
    );
  }
}
