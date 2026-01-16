import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresignedAudioUrl } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

const DEMO_EMAIL = "demo2@listenlayer.local";
const DEMO_TITLE = "Could Life Survive on Mars? Yeast Offers a Surprising Answer";

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rate = rateLimit(`demo-audio:${ip}`, 30, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Demo user not found" }, { status: 404 });
  }

  const episode = await prisma.episode.findFirst({
    where: {
      userId: user.id,
      status: "PUBLISHED",
      audioObjectKey: { not: null },
      title: { contains: DEMO_TITLE, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!episode?.audioObjectKey) {
    return NextResponse.json({ error: "Demo episode not found" }, { status: 404 });
  }

  const ttl = Number(process.env.AUDIO_URL_TTL_SECONDS || 21600);
  const url = await getPresignedAudioUrl(episode.audioObjectKey, ttl);
  return NextResponse.json({
    url,
    publicId: episode.publicId,
    title: episode.title,
    sourceUrl: episode.sourceUrl,
    durationSec: episode.durationSec ?? null,
  });
}
