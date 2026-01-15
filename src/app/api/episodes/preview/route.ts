import { NextResponse } from "next/server";
import { z } from "zod";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { getDomainFromUrl } from "@/lib/url";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  url: z.string().url(),
});

function summarize(text: string, limit: number) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const res = await fetch(parsed.data.url, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json({ error: "Unable to fetch URL" }, { status: 400 });
    }

    const html = await res.text();
    const dom = new JSDOM(html, { url: parsed.data.url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const title =
      article?.title?.trim() ||
      dom.window.document.title?.trim() ||
      "Untitled article";
    const textContent =
      article?.textContent ||
      dom.window.document.body?.textContent ||
      "";
    const normalizedText = textContent.replace(/\s+/g, " ").trim();
    const excerptSource = article?.excerpt || normalizedText;
    const excerpt = excerptSource ? summarize(excerptSource, 180) : "";
    const wordCount = normalizedText ? normalizedText.split(" ").length : 0;
    const estimatedMinutes = wordCount ? Math.max(1, Math.round(wordCount / 180)) : 0;

    return NextResponse.json({
      title,
      excerpt,
      wordCount,
      estimatedMinutes,
      siteName: article?.siteName || getDomainFromUrl(parsed.data.url),
      url: parsed.data.url,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to preview article" },
      { status: 500 }
    );
  }
}
