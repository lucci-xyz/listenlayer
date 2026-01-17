import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isAllowedAppOrigin } from "@/lib/security";

const schema = z.object({
  publicId: z.string().min(1),
  kind: z.enum(["play", "progress"]),
  value: z.number().int().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  if (!isAllowedAppOrigin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rate = await rateLimit(`analytics:${ip}`, "analytics");
  if (!rate.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const episode = await prisma.episode.findUnique({
    where: { publicId: parsed.data.publicId },
  });
  if (!episode || episode.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.playbackEvent.create({
    data: {
      episodeId: episode.id,
      kind: parsed.data.kind,
      value: parsed.data.value,
      ua: request.headers.get("user-agent") || undefined,
      referrer: request.headers.get("referer") || undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
