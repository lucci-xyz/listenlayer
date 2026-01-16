import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanFromPriceId } from "@/lib/stripe";
import { FeedDetailClient } from "./feed-detail-client";

export const dynamic = "force-dynamic";

export default async function FeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const currentPlan = getPlanFromPriceId(user.subscriptionPriceId ?? null);

  const feed = await prisma.feed.findFirst({
    where: { id, userId: user.id },
    include: {
      episodes: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          sourceUrl: true,
          publicId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!feed) {
    notFound();
  }

  return (
    <FeedDetailClient
      feed={{
        id: feed.id,
        name: feed.name,
        feedUrl: feed.feedUrl,
        siteUrl: feed.siteUrl,
        faviconUrl: feed.faviconUrl,
        lastFetchedAt: feed.lastFetchedAt?.toISOString() || null,
        lastError: feed.lastError,
      }}
      episodes={feed.episodes.map((ep) => ({
        id: ep.id,
        title: ep.title,
        status: ep.status,
        sourceUrl: ep.sourceUrl,
        publicId: ep.publicId,
        createdAt: ep.createdAt.toISOString(),
      }))}
      currentPlan={currentPlan}
      creditsResetAt={user.subscriptionCurrentPeriodEnd?.toISOString() ?? null}
    />
  );
}
