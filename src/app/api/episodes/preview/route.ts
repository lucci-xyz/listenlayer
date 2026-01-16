import { NextResponse } from "next/server";
import { z } from "zod";
import Parser from "rss-parser";
import { getDomainFromUrl } from "@/lib/url";
import { requireUser } from "@/lib/auth";
import { extractMainTextFromHtml, extractMetaContent, extractTitleFromHtml, summarize } from "@/lib/html";

const authSchema = z
  .object({
    type: z.enum(["basic", "bearer"]),
    username: z.string().optional(),
    password: z.string().optional(),
    token: z.string().optional(),
  })
  .optional();

const schema = z.object({
  url: z.string().url(),
  auth: authSchema,
});

const feedMarker = /<(rss|feed|channel)\b/i;
const defaultHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

function stripHtml(input: string) {
  // Backwards-compatible helper for RSS content snippets (RSS parser may provide HTML fragments).
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type SourceAuth = {
  type: "basic" | "bearer";
  username?: string;
  password?: string;
  token?: string;
};

function buildAuthHeaders(auth?: SourceAuth): Record<string, string> {
  if (!auth) return {};
  if (auth.type === "basic" && auth.username && auth.password) {
    const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
  if (auth.type === "bearer" && auth.token) {
    return { Authorization: `Bearer ${auth.token}` };
  }
  return {};
}

function getAuthHint(response: Response) {
  const header = response.headers.get("www-authenticate")?.toLowerCase() || "";
  if (header.includes("basic")) return "basic";
  if (header.includes("bearer")) return "bearer";
  return null;
}

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const authHeaders = buildAuthHeaders(parsed.data.auth);
    const res = await fetch(parsed.data.url, {
      redirect: "follow",
      headers: { ...defaultHeaders, ...authHeaders },
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        const authHint = getAuthHint(res);
        const message =
          authHeaders.Authorization
            ? "Credentials were rejected or are insufficient."
            : "Source requires authentication. Add credentials to continue.";
        return NextResponse.json(
          { error: message, code: "FORBIDDEN", status: res.status, authHint },
          { status: 403 }
        );
      }
      if (res.status === 404 || res.status === 410) {
        return NextResponse.json(
          { error: "Source not found", status: res.status },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Unable to fetch URL", status: res.status },
        { status: 400 }
      );
    }

    const html = await res.text();

    if (feedMarker.test(html)) {
      try {
        const parser = new Parser();
        const feed = await parser.parseString(html);
        const items = (feed.items || [])
          .filter((item) => item?.link)
          .slice(0, 20)
          .map((item, index) => {
            const pubDate = item.pubDate || item.isoDate || null;
            const baseKey =
              (typeof item.guid === "string" && item.guid) ||
              (typeof item.link === "string" && item.link) ||
              "item";
            const id = `${baseKey}-${pubDate ?? "no-date"}-${index}`;
            const rawContent = item.content || item.contentSnippet || "";
            const contentText = rawContent
              ? stripHtml(rawContent).slice(0, 8000)
              : null;

            return {
              id,
              title: item.title || "Untitled",
              url: item.link as string,
              pubDate,
              description:
                item.contentSnippet?.slice(0, 200) ||
                item.content?.slice(0, 200) ||
                null,
              contentText,
            };
          });

        if (items.length === 0) {
          return NextResponse.json({ error: "Feed has no episodes" }, { status: 400 });
        }

        const feedTitle = feed.title?.trim() || getDomainFromUrl(parsed.data.url);

        return NextResponse.json({
          kind: "feed",
          feed: {
            title: feedTitle,
            feedUrl: parsed.data.url,
            siteUrl: feed.link || null,
            itemCount: feed.items?.length || items.length,
          },
          items,
        });
      } catch {
        return NextResponse.json({ error: "Invalid RSS feed" }, { status: 400 });
      }
    }

    const title = extractTitleFromHtml(html, "Untitled article") || "Untitled article";
    const normalizedText = extractMainTextFromHtml(html);
    const description =
      extractMetaContent(html, "description") || extractMetaContent(html, "og:description");
    const excerptSource = description || normalizedText;
    const excerpt = excerptSource ? summarize(excerptSource, 180) : "";
    const wordCount = normalizedText ? normalizedText.split(" ").length : 0;
    const estimatedMinutes = wordCount ? Math.max(1, Math.round(wordCount / 180)) : 0;

    return NextResponse.json({
      kind: "article",
      title,
      excerpt,
      wordCount,
      estimatedMinutes,
      siteName: extractMetaContent(html, "og:site_name") || getDomainFromUrl(parsed.data.url),
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
