import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresignedAudioUrl } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const pathname = new URL(request.url).pathname;
  const segments = pathname.split("/").filter(Boolean);
  const fallbackPublicId = segments.length >= 2 ? segments[segments.length - 2] : null;
  const resolvedParams = await params;
  const publicId = resolvedParams?.publicId || fallbackPublicId;
  if (!publicId) {
    return NextResponse.json({ error: "Missing publicId" }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rate = rateLimit(`audio-url:${ip}`, 30, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const episode = await prisma.episode.findUnique({
    where: { publicId },
  });
  if (!episode || episode.status !== "PUBLISHED" || !episode.audioObjectKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ttl = Number(process.env.AUDIO_URL_TTL_SECONDS || 21600);
  const url = await getPresignedAudioUrl(episode.audioObjectKey, ttl);
  return NextResponse.json({ url });
}
