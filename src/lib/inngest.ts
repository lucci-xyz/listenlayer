import { Inngest } from "inngest";
import Parser from "rss-parser";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { JSDOM } from "jsdom";
import { prisma } from "@/lib/prisma";
import { extractReadableText } from "@/lib/content";
import { chunkText, estimateDurationSec, extractJsonObject } from "@/lib/text";
import { openai } from "@/lib/openai";
import { getR2Client, getR2Bucket, deleteAudioObjects } from "@/lib/r2";
import { maybeNormalizeMp3 } from "@/lib/audio";

export const inngest = new Inngest({ id: "listenlayer" });

const parser = new Parser();

async function fetchLatestFromRss(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  const xml = await response.text();
  const feed = await parser.parseString(xml);
  const item = feed.items?.[0];
  if (!item?.link) {
    throw new Error("RSS feed has no items");
  }
  return {
    title: item.title || feed.title || "Untitled Episode",
    link: item.link,
    feedTitle: feed.title || null,
  };
}

async function fetchHtml(url: string) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status}`);
  }
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > 5 * 1024 * 1024) {
    throw new Error("Article exceeds 5MB limit");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error("Article exceeds 5MB limit");
  }
  return buffer.toString("utf-8");
}

async function generateScriptAndChapters(
  title: string,
  url: string,
  text: string,
  format: string | undefined
) {
  const trimmed = text.slice(0, 12000);
  const formatGuidance =
    format === "two-host"
      ? "Write as a two-host conversation. Prefix each spoken line with H1: or H2: (no other labels) so we can split voices. Avoid narration or stage directions. Plain text only."
      : format === "tldr"
        ? "Write as a tight TLDR recap with punchy narration, still 500-900 words. Plain text only."
        : "Write as a single-host narration. Plain text only.";
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    input: [
      {
        role: "system",
        content:
          `You are a podcast script writer. Only use the provided article text. Do not add outside facts. ${formatGuidance} Return JSON only, with keys 'script' and 'chapters'. 'script' must be plain text, 500-900 words, 3-6 minutes. 'chapters' is an array of {title, startApproxSec} with ascending start times.`,
      },
      {
        role: "user",
        content: `Title: ${title}\nURL: ${url}\n\nArticle text:\n${trimmed}`,
      },
    ],
  });

  const output = response.output_text?.trim() || "";

  try {
    const parsed = extractJsonObject(output);
    const script = typeof parsed.script === "string" ? parsed.script.trim() : "";
    type ChapterInput = { title?: unknown; startApproxSec?: unknown };
    const rawChapters = Array.isArray(parsed.chapters)
      ? (parsed.chapters as ChapterInput[])
      : [];
    const chapters = rawChapters
      .filter(
        (chapter): chapter is ChapterInput & { title: string } =>
          Boolean(chapter) && typeof chapter.title === "string"
      )
      .map((chapter, index) => ({
        title: chapter.title,
        startApproxSec:
          typeof chapter.startApproxSec === "number"
            ? Math.max(0, Math.floor(chapter.startApproxSec))
            : index * 60,
      }));
    if (!script) {
      throw new Error("Script generation failed");
    }
    return { script, chapters };
  } catch {
    const words = trimmed.split(/\s+/).slice(0, 850);
    const fallbackScript = words.join(" ");
    const approxDuration = estimateDurationSec(fallbackScript);
    const fallbackChapters = [
      { title: "Overview", startApproxSec: 0 },
      { title: "Key details", startApproxSec: Math.floor(approxDuration / 3) },
      { title: "Wrap-up", startApproxSec: Math.floor((approxDuration / 3) * 2) },
    ];
    return { script: fallbackScript, chapters: fallbackChapters };
  }
}

type TwoHostSegment = { speaker: "H1" | "H2" | "UNK"; text: string };

function parseTwoHostSegments(script: string): TwoHostSegment[] {
  const lines = script.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const segments: TwoHostSegment[] = [];
  const patterns = [
    { regex: /^h(?:ost)?\s*1\s*:\s*(.+)$/i, speaker: "H1" as const },
    { regex: /^h(?:ost)?\s*one\s*:\s*(.+)$/i, speaker: "H1" as const },
    { regex: /^h1\s*:\s*(.+)$/i, speaker: "H1" as const },
    { regex: /^h(?:ost)?\s*2\s*:\s*(.+)$/i, speaker: "H2" as const },
    { regex: /^h(?:ost)?\s*two\s*:\s*(.+)$/i, speaker: "H2" as const },
    { regex: /^h2\s*:\s*(.+)$/i, speaker: "H2" as const },
  ];

  for (const line of lines) {
    let matched = false;
    for (const pattern of patterns) {
      const m = line.match(pattern.regex);
      if (m && m[1]) {
        segments.push({ speaker: pattern.speaker, text: m[1].trim() });
        matched = true;
        break;
      }
    }
    if (!matched && line) {
      segments.push({ speaker: "UNK", text: line });
    }
  }
  return segments;
}

function fallbackAlternateSegments(script: string): TwoHostSegment[] {
  const paragraphs = script
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    const sentences = script
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return sentences.map((text, idx) => ({
      speaker: idx % 2 === 0 ? "H1" : "H2",
      text,
    }));
  }
  return paragraphs.map((text, idx) => ({
    speaker: idx % 2 === 0 ? "H1" : "H2",
    text,
  }));
}

function deriveTitleFromHtml(html: string, url: string, fallback: string) {
  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const meta = (selector: string) => doc.querySelector(selector)?.getAttribute("content") || "";
    const title =
      meta('meta[property="og:title"]') ||
      meta('meta[name="twitter:title"]') ||
      doc.querySelector("h1")?.textContent?.trim() ||
      doc.title ||
      fallback;
    return title || fallback;
  } catch {
    return fallback;
  }
}

// New simplified episode generation - works with or without a feed
export const generateEpisode = inngest.createFunction(
  { id: "episode-generate" },
  { event: "episode/generate.requested" },
  async ({ event, step }) => {
    const { userId, episodeId, feedId, canonicalUrl, episodeTitle, format } =
      event.data as {
        userId: string;
        episodeId: string;
        feedId?: string | null;
        canonicalUrl: string;
        episodeTitle?: string;
        format?: string;
      };

    let cachedTwoHostSegments: TwoHostSegment[] | null = null;

    try {
      const episodeState = await step.run("load-episode", async () => {
        return prisma.episode.findUnique({
          where: { id: episodeId },
          select: { status: true },
        });
      });

      if (!episodeState) {
        return { skipped: true };
      }

      if (episodeState.status === "CANCELLED") {
        return { cancelled: true };
      }

      await step.run("mark-running", async () => {
        await prisma.episode.updateMany({
          where: { id: episodeId, status: { not: "CANCELLED" } },
          data: { status: "RUNNING" },
        });
      });

      // Resolve the source URL - either from feed or directly from canonicalUrl
      const resolved = await step.run("resolve-source", async () => {
        // If we have a feedId and no canonicalUrl, fetch latest from feed
        if (feedId && !canonicalUrl) {
          const feed = await prisma.feed.findUnique({ where: { id: feedId } });
          if (!feed) throw new Error("Feed not found");
          const latest = await fetchLatestFromRss(feed.feedUrl);
          return {
            canonicalUrl: latest.link,
            episodeTitle: latest.title,
            latestItemTitle: latest.title,
            latestItemUrl: latest.link,
            feedTitle: latest.feedTitle,
          };
        }
        // Otherwise use the provided URL
        return {
          canonicalUrl: canonicalUrl,
          episodeTitle: episodeTitle || "Episode",
          latestItemTitle: episodeTitle || null,
          latestItemUrl: canonicalUrl,
          feedTitle: null,
        };
      });

      // Update feed metadata if this came from a feed
      if (feedId) {
        await step.run("update-feed-meta", async () => {
          await prisma.feed.update({
            where: { id: feedId },
            data: {
              latestItemTitle: resolved.latestItemTitle,
              latestItemUrl: resolved.latestItemUrl,
              lastFetchedAt: new Date(),
              lastError: null,
            },
          });
        });
      }

      const cancelBeforeScript = await step.run("check-cancel-before-script", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { status: true },
        });
        if (!episode) return true;
        return episode.status === "CANCELLED";
      });
      if (cancelBeforeScript) {
        return { cancelled: true };
      }

      await step.run("generate-script", async () => {
        const html = await fetchHtml(resolved.canonicalUrl);
        const readableText = extractReadableText(html, resolved.canonicalUrl);
        const words = readableText ? readableText.split(/\s+/).filter(Boolean) : [];
        if (!readableText || words.length < 300) {
          throw new Error("Not enough article text to generate an episode");
        }
        const betterTitle = deriveTitleFromHtml(html, resolved.canonicalUrl, resolved.episodeTitle);
        const { script, chapters } = await generateScriptAndChapters(
          betterTitle,
          resolved.canonicalUrl,
          readableText,
          format
        );
        if (format === "two-host") {
          const parsed = parseTwoHostSegments(script);
          cachedTwoHostSegments = parsed.length > 0 ? parsed : fallbackAlternateSegments(script);
        }
        const cleanScript =
          format === "two-host" && cachedTwoHostSegments?.length
            ? cachedTwoHostSegments.map((seg) => seg.text).join("\n\n")
            : script;

        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            title: betterTitle || resolved.episodeTitle,
            sourceUrl: resolved.canonicalUrl,
            scriptText: cleanScript,
            transcriptText: cleanScript,
            chaptersJson: chapters,
            format: format || null,
          },
        });
        return { length: script.length };
      });

      const cancelBeforeAudio = await step.run("check-cancel-before-audio", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { status: true },
        });
        if (!episode) return true;
        return episode.status === "CANCELLED";
      });
      if (cancelBeforeAudio) {
        return { cancelled: true };
      }

      const uploadKey = await step.run("generate-and-upload-audio", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { scriptText: true },
        });
        if (!episode?.scriptText) {
          throw new Error("Script is missing");
        }
        const primaryVoice = process.env.OPENAI_TTS_VOICE || "marin";
        const secondaryVoice = process.env.OPENAI_TTS_VOICE_SECONDARY || "verse";
        const buffers: Buffer[] = [];

        if (format === "two-host" && cachedTwoHostSegments?.length) {
          for (const segment of cachedTwoHostSegments) {
            const voice = segment.speaker === "H2" ? secondaryVoice || primaryVoice : primaryVoice;
            const chunks = chunkText(segment.text, 3500);
            for (const chunk of chunks) {
              const cancelled = await prisma.episode.findUnique({
                where: { id: episodeId },
                select: { status: true },
              });
              if (!cancelled || cancelled.status === "CANCELLED") {
                return null;
              }
              const audio = await openai.audio.speech.create({
                model: "gpt-4o-mini-tts",
                voice,
                input: chunk,
                response_format: "mp3",
              });
              const buffer = Buffer.from(await audio.arrayBuffer());
              buffers.push(buffer);
            }
          }
        } else {
          const chunks = chunkText(episode.scriptText, 3500);
          for (const chunk of chunks) {
            const cancelled = await prisma.episode.findUnique({
              where: { id: episodeId },
              select: { status: true },
            });
            if (!cancelled || cancelled.status === "CANCELLED") {
              return null;
            }
            const audio = await openai.audio.speech.create({
              model: "gpt-4o-mini-tts",
              voice: primaryVoice,
              input: chunk,
              response_format: "mp3",
            });
            const buffer = Buffer.from(await audio.arrayBuffer());
            buffers.push(buffer);
          }
        }

        if (buffers.length === 0) {
          return null;
        }
        const combined = Buffer.concat(buffers);
        const normalized = await maybeNormalizeMp3(combined);

        const key = `episodes/${episodeId}.mp3`;
        const client = getR2Client();
        const bucket = getR2Bucket();
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: normalized,
            ContentType: "audio/mpeg",
          })
        );
        return key;
      });

      if (!uploadKey) {
        return { cancelled: true };
      }

      const cancelBeforePublish = await step.run("check-cancel-before-publish", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { status: true },
        });
        if (!episode) return true;
        return episode.status === "CANCELLED";
      });
      if (cancelBeforePublish) {
        await step.run("cleanup-audio", async () => {
          try {
            await deleteAudioObjects([uploadKey]);
          } catch {
            // Ignore cleanup failures in local/dev environments.
          }
        });
        return { cancelled: true };
      }

      await step.run("update-episode", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { scriptText: true },
        });
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            status: "PUBLISHED",
            audioObjectKey: uploadKey,
            durationSec: episode?.scriptText ? estimateDurationSec(episode.scriptText) : null,
            publishedAt: new Date(),
            errorMessage: null,
          },
        });
      });

      return { episodeId, userId };
    } catch (error) {
      const shouldThrow = await step.run("mark-failed", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { status: true },
        });
        if (!episode || episode.status === "CANCELLED") {
          return false;
        }
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });

        // Update feed error if applicable
        if (feedId) {
          await prisma.feed.update({
            where: { id: feedId },
            data: {
              lastError: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
        return true;
      });

      if (shouldThrow) {
        throw error;
      }
      return { cancelled: true };
    }
  }
);

export const functions = [generateEpisode];
