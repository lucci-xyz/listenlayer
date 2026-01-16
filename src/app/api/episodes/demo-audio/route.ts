import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { isAllowedAppOrigin } from "@/lib/security";

const DEMO_AUDIO_URL = process.env.DEMO_AUDIO_URL || "/demo/demo-audio.mp3";
const DEMO_TITLE = "Could Life Survive on Mars? Yeast Offers a Surprising Answer";
const DEMO_SOURCE_URL =
  "https://scitechdaily.com/could-life-survive-on-mars-yeast-offers-a-surprising-answer/";

export async function GET(request: Request) {
  if (!isAllowedAppOrigin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rate = rateLimit(`demo-audio:${ip}`, 30, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  return NextResponse.json({
    url: DEMO_AUDIO_URL,
    publicId: "demo",
    title: DEMO_TITLE,
    sourceUrl: DEMO_SOURCE_URL,
    durationSec: null,
  });
}
