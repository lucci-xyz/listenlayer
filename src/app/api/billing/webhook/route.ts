import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getPlanLimits } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function mapStripeStatus(status: string): SubscriptionStatus {
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

export async function POST(req: Request) {
  if (!stripe || !webhookSecret) {
    console.error("Stripe not fully configured");
    return NextResponse.json(
      { error: "Billing not configured" },
      { status: 503 }
    );
  }

  const stripeClient = stripe;
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const subscription = (await stripeClient.subscriptions.retrieve(
            subscriptionId,
            { expand: ["items.data"] }
          )) as Stripe.Subscription;
          const firstItem = subscription.items.data[0];
          const priceId = firstItem?.price?.id ?? null;
          const limits = getPlanLimits(priceId);
          const periodEnd = firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : null;

          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionId,
              subscriptionStatus: mapStripeStatus(subscription.status),
              subscriptionPriceId: priceId,
              subscriptionCurrentPeriodEnd: periodEnd,
              episodeCredits: limits.episodesPerMonth,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const firstItem = subscription.items.data[0];
        const priceId = firstItem?.price?.id ?? null;
        const periodEnd = firstItem?.current_period_end
          ? new Date(firstItem.current_period_end * 1000)
          : null;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: mapStripeStatus(subscription.status),
              subscriptionPriceId: priceId,
              subscriptionCurrentPeriodEnd: periodEnd,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionId: null,
              subscriptionStatus: "CANCELED",
              subscriptionPriceId: null,
              subscriptionCurrentPeriodEnd: null,
              episodeCredits: 3, // Reset to free tier
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Reset credits on successful payment (new billing cycle)
        if (invoice.billing_reason === "subscription_cycle") {
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (user) {
            const limits = getPlanLimits(user.subscriptionPriceId);
            await prisma.user.update({
              where: { id: user.id },
              data: {
                episodeCredits: limits.episodesPerMonth,
              },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
