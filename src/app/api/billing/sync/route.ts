import { NextResponse } from "next/server";
import { stripe, getPlanLimits, stripeMode } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    default:
      return "ACTIVE";
  }
}

export async function POST() {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Billing not configured" },
        { status: 503 }
      );
    }

    const stripeClient = stripe;
    const user = await requireUser();

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 400 }
      );
    }

    try {
      const subscriptions = await stripeClient.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "all",
        limit: 1,
        expand: ["data.items.data"],
      });

      const subscription = subscriptions.data[0];

      if (!subscription) {
        return NextResponse.json(
          { error: "No subscription found" },
          { status: 404 }
        );
      }

      const firstItem = subscription.items.data[0];
      const priceId = firstItem?.price?.id ?? null;
      const limits = getPlanLimits(priceId);
      const periodEnd = firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionId: subscription.id,
          subscriptionStatus: mapStripeStatus(subscription.status),
          subscriptionPriceId: priceId,
          subscriptionCurrentPeriodEnd: periodEnd,
          episodeCredits: limits.episodesPerMonth,
        },
      });

      return NextResponse.json({ synced: true });
    } catch (error) {
      const err = error as { code?: string; param?: string };
      if (err?.code === "resource_missing" && err?.param === "customer") {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            stripeCustomerId: null,
            subscriptionId: null,
            subscriptionStatus: null,
            subscriptionPriceId: null,
            subscriptionCurrentPeriodEnd: null,
          },
        });
        return NextResponse.json(
          {
            error: `Stripe customer not found for ${stripeMode} mode. Please reopen checkout to create a new customer.`,
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Billing sync error:", error);
    return NextResponse.json(
      { error: "Unable to sync billing status" },
      { status: 500 }
    );
  }
}
