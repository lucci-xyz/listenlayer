import { Inngest } from "inngest";
import Parser from "rss-parser";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { extractTitleFromHtml } from "@/lib/html";
import { chunkText, estimateDurationSec, extractJsonObject } from "@/lib/text";
import { openai } from "@/lib/openai";
import { getR2Client, getR2Bucket, deleteAudioObjects } from "@/lib/r2";
import { maybeNormalizeMp3 } from "@/lib/audio";
import { validateExternalUrl } from "@/lib/url-validator";
import { loggers, logError } from "@/lib/logger";
import { fetchWithTimeout, browserLikeHeaders, feedHeaders } from "@/lib/fetch";
import { fetchHtmlSmart } from "@/lib/html-stream";

const log = loggers.inngest;

// TTS Configuration - optimized for cost/performance
const TTS_CHUNK_SIZE = 4000; // Max is 4096, use 4000 for safety margin
const TTS_CONCURRENCY = 3; // Process 3 TTS requests in parallel
const CANCEL_CHECK_INTERVAL = 3; // Check cancellation every N chunks

/**
 * Process items in batches with concurrency limit
 */
async function processBatch<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((item, idx) => fn(item, i + idx))
    );
    results.push(...batchResults);
  }
  return results;
}

export const inngest = new Inngest({ id: "listenlayer" });

const parser = new Parser();
// Using imported headers from fetch.ts

type SourceAuth = {
  type: "basic" | "bearer";
  username?: string;
  password?: string;
  token?: string;
};

function buildAuthHeaders(auth?: SourceAuth | null): Record<string, string> {
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

async function fetchWithHeaders(
  url: string,
  headers: Record<string, string> = {}
) {
  return fetchWithTimeout(url, {
    redirect: "follow",
    timeoutMs: 15000,
    headers: { ...browserLikeHeaders, ...headers },
  });
}

async function fetchLatestFromRss(url: string, auth?: SourceAuth | null) {
  const response = await fetchWithTimeout(url, {
    redirect: "follow",
    timeoutMs: 12000,
    headers: {
      ...feedHeaders,
      ...buildAuthHeaders(auth),
    },
  });
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

class FetchError extends Error {
  status: number;

  constructor(status: number) {
    super(`Failed to fetch article: ${status}`);
    this.status = status;
  }
}

/**
 * Fetch HTML with streaming support for large pages like live blogs.
 * Returns both HTML and pre-extracted text for efficiency.
 */
async function fetchHtmlWithText(url: string, auth?: SourceAuth | null) {
  const authHeaders = buildAuthHeaders(auth);
  
  try {
    const result = await fetchHtmlSmart(url, authHeaders);
    
    log.info({
      url,
      bytesDownloaded: result.bytesDownloaded,
      textLength: result.text.length,
      stoppedEarly: result.stoppedEarly,
    }, "HTML fetched successfully");
    
    return result;
  } catch (error) {
    // Try with simpler user agent if blocked
    if (error instanceof Error && error.message.includes("403")) {
      const result = await fetchHtmlSmart(url, {
        "User-Agent": "ListenLayer/1.0",
        ...authHeaders,
      });
      return result;
    }
    throw error;
  }
}

// Legacy function for compatibility
async function fetchHtml(url: string, auth?: SourceAuth | null) {
  const result = await fetchHtmlWithText(url, auth);
  return result.html;
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

function buildTwoHostSegments(script: string): TwoHostSegment[] {
  const parsed = parseTwoHostSegments(script).filter((seg) => seg.text.trim().length > 0);
  const hasH1 = parsed.some((seg) => seg.speaker === "H1");
  const hasH2 = parsed.some((seg) => seg.speaker === "H2");

  if (!hasH1 || !hasH2) {
    return fallbackAlternateSegments(script);
  }

  let lastSpeaker: "H1" | "H2" = hasH1 ? "H1" : "H2";
  return parsed.map((seg) => {
    if (seg.speaker === "H1" || seg.speaker === "H2") {
      lastSpeaker = seg.speaker;
      return seg;
    }
    const nextSpeaker = lastSpeaker === "H1" ? "H2" : "H1";
    lastSpeaker = nextSpeaker;
    return { speaker: nextSpeaker, text: seg.text };
  });
}

function deriveTitleFromHtml(html: string, url: string, fallback: string) {
  const title = extractTitleFromHtml(html, fallback) || fallback;
  return title;
}

// New simplified episode generation - works with or without a feed
export const generateEpisode = inngest.createFunction(
  { id: "episode-generate" },
  { event: "episode/generate.requested" },
  async ({ event, step }) => {
    const {
      userId,
      episodeId,
      feedId,
      canonicalUrl,
      episodeTitle,
      format,
      sourceText,
      sourceAuth,
    } = event.data as {
      userId: string;
      episodeId: string;
      feedId?: string | null;
      canonicalUrl: string;
      episodeTitle?: string;
      format?: string;
      sourceText?: string;
      sourceAuth?: SourceAuth | null;
    };

    let cachedTwoHostSegments: TwoHostSegment[] | null = null;
    const sourceWordCount = sourceText ? sourceText.split(/\s+/).filter(Boolean).length : 0;

    log.info({
      episodeId,
      userId,
      feedId,
      canonicalUrl,
      format,
      sourceWordCount,
      hasAuth: Boolean(sourceAuth),
    }, "Episode generation started");

    try {
      const episodeState = await step.run("load-episode", async () => {
        return prisma.episode.findUnique({
          where: { id: episodeId },
          select: {
            status: true,
            scriptText: true,
            audioObjectKey: true,
            format: true,
          },
        });
      });

      if (!episodeState) {
        return { skipped: true };
      }

      if (episodeState.status === "CANCELLED") {
        return { cancelled: true };
      }

      if (episodeState.status === "PUBLISHED" && episodeState.audioObjectKey) {
        log.info({ episodeId }, "Skipping already published episode");
        return { skipped: true };
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
          const latest = await fetchLatestFromRss(feed.feedUrl, sourceAuth);
          return {
            canonicalUrl: latest.link,
            episodeTitle: latest.title,
            latestItemTitle: latest.title,
            latestItemUrl: latest.link,
            feedTitle: latest.feedTitle,
            sourceText: sourceText || null,
          };
        }
        // Otherwise use the provided URL
        return {
          canonicalUrl: canonicalUrl,
          episodeTitle: episodeTitle || "Episode",
          latestItemTitle: episodeTitle || null,
          latestItemUrl: canonicalUrl,
          feedTitle: null,
          sourceText: sourceText || null,
        };
      });

      log.info({
        episodeId,
        canonicalUrl: resolved.canonicalUrl,
        sourceTextWords: resolved.sourceText ? resolved.sourceText.split(/\s+/).filter(Boolean).length : 0,
      }, "Source resolved");

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

      // Script generation (includes cancellation and existence checks)
      const scriptResult = await step.run("generate-script", async () => {
        const existing = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { scriptText: true, chaptersJson: true, status: true },
        });
        
        // Early exit if cancelled or missing
        if (!existing || existing.status === "CANCELLED") {
          return { cancelled: true, script: null };
        }

        if (existing.scriptText && existing.scriptText.trim().length > 0) {
          log.info({ episodeId }, "Script exists, skipping generation");
          return { skipped: true, script: existing.scriptText, cancelled: false };
        }

        let fetchResult: { html: string; text: string; title: string | null; stoppedEarly: boolean } | null = null;
        let readableText = resolved.sourceText?.trim() || "";
        
        // Check if provided source text is sufficient
        if (readableText) {
          const words = readableText.split(/\s+/).filter(Boolean);
          if (words.length < 120) {
            readableText = "";
          }
        }
        
        // Fetch HTML with streaming if no sufficient source text
        if (!readableText) {
          fetchResult = await fetchHtmlWithText(resolved.canonicalUrl, sourceAuth);
          // Use pre-extracted text from streaming fetch (more efficient for large pages)
          readableText = fetchResult.text;
        }
        
        const words = readableText ? readableText.split(/\s+/).filter(Boolean) : [];
        const minWords = 300;
        if (!readableText || words.length < minWords) {
          throw new Error(`Article too short: found ${words.length} words, need at least ${minWords}. This article may be too brief for audio generation.`);
        }

        log.info({
          episodeId,
          wordCount: words.length,
          usedSourceText: Boolean(resolved.sourceText),
          stoppedEarly: fetchResult?.stoppedEarly ?? false,
        }, "Article text ready for processing");

        // Use title from fetch result if available, otherwise derive from HTML
        const betterTitle = fetchResult?.title 
          ? fetchResult.title
          : (fetchResult?.html 
              ? deriveTitleFromHtml(fetchResult.html, resolved.canonicalUrl, resolved.episodeTitle)
              : resolved.episodeTitle);
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
        return { length: script.length, script: cleanScript, cancelled: false };
      });

      // Early exit if script generation was cancelled
      if ('cancelled' in scriptResult && scriptResult.cancelled) {
        return { cancelled: true };
      }

      const uploadKey = await step.run("generate-and-upload-audio", async () => {
        // First check if audio already exists (for retry scenarios)
        const existing = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { audioObjectKey: true },
        });
        if (existing?.audioObjectKey) {
          log.info({ episodeId }, "Audio exists, skipping generation");
          return existing.audioObjectKey;
        }

        // Use script from previous step result if available, otherwise fetch
        let scriptText: string | null = null;
        if ('script' in scriptResult && scriptResult.script) {
          scriptText = scriptResult.script;
        } else {
          const episode = await prisma.episode.findUnique({
            where: { id: episodeId },
            select: { scriptText: true },
          });
          scriptText = episode?.scriptText || null;
        }

        if (!scriptText) {
          throw new Error("Script is missing");
        }

        const primaryVoice = process.env.OPENAI_TTS_VOICE || "marin";
        const secondaryVoice = process.env.OPENAI_TTS_VOICE_SECONDARY || "verse";

        const audioFormat = format || null;
        log.info({
          episodeId,
          audioFormat,
          primaryVoice,
          secondaryVoice,
        }, "Starting TTS generation");

        // Prepare all TTS work items upfront
        type TtsWorkItem = { text: string; voice: string };
        const workItems: TtsWorkItem[] = [];

        // Use cached segments if available, otherwise parse
        const twoHostSegments =
          audioFormat === "two-host" 
            ? (cachedTwoHostSegments || buildTwoHostSegments(scriptText)) 
            : null;

        if (audioFormat === "two-host" && twoHostSegments?.length) {
          for (const segment of twoHostSegments) {
            const voice = segment.speaker === "H2" ? secondaryVoice || primaryVoice : primaryVoice;
            const chunks = chunkText(segment.text, TTS_CHUNK_SIZE);
            for (const chunk of chunks) {
              workItems.push({ text: chunk, voice });
            }
          }
        } else {
          const chunks = chunkText(scriptText, TTS_CHUNK_SIZE);
          for (const chunk of chunks) {
            workItems.push({ text: chunk, voice: primaryVoice });
          }
        }

        log.info({
          episodeId,
          totalChunks: workItems.length,
          concurrency: TTS_CONCURRENCY,
        }, "TTS work prepared");

        // Track cancellation status (check periodically, not every chunk)
        let isCancelled = false;
        let chunksProcessed = 0;

        // Process TTS in parallel batches with periodic cancel checks
        const buffers = await processBatch(
          workItems,
          async (item) => {
            // Check cancellation every CANCEL_CHECK_INTERVAL chunks (batched check)
            if (chunksProcessed > 0 && chunksProcessed % CANCEL_CHECK_INTERVAL === 0) {
              const status = await prisma.episode.findUnique({
                where: { id: episodeId },
                select: { status: true },
              });
              if (!status || status.status === "CANCELLED") {
                isCancelled = true;
              }
            }
            chunksProcessed++;

            if (isCancelled) {
              return null;
            }

            const audio = await openai.audio.speech.create({
              model: "gpt-4o-mini-tts",
              voice: item.voice,
              input: item.text,
              response_format: "mp3",
            });
            return Buffer.from(await audio.arrayBuffer());
          },
          TTS_CONCURRENCY
        );

        // Filter out nulls (from cancellation) and check if we got anything
        const validBuffers = buffers.filter((b) => b !== null);
        if (validBuffers.length === 0 || isCancelled) {
          return null;
        }

        log.info({
          episodeId,
          buffersGenerated: validBuffers.length,
        }, "TTS generation complete");

        const combined = Buffer.concat(validBuffers);
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

      // Publish episode - combine cancel check with update to reduce DB queries
      await step.run("publish-episode", async () => {
        const episode = await prisma.episode.findUnique({
          where: { id: episodeId },
          select: { status: true, audioObjectKey: true },
        });
        
        // Already published or cancelled
        if (!episode) return { skipped: true };
        if (episode.status === "PUBLISHED" && episode.audioObjectKey) {
          return { skipped: true };
        }
        if (episode.status === "CANCELLED") {
          // Cleanup uploaded audio if cancelled
          try {
            await deleteAudioObjects([uploadKey]);
          } catch {
            // Ignore cleanup failures
          }
          return { cancelled: true };
        }

        // Use script from earlier step result to calculate duration (avoid re-fetch)
        const scriptForDuration = 'script' in scriptResult && scriptResult.script 
          ? scriptResult.script 
          : null;

        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            status: "PUBLISHED",
            audioObjectKey: uploadKey,
            durationSec: scriptForDuration ? estimateDurationSec(scriptForDuration) : null,
            publishedAt: new Date(),
            errorMessage: null,
          },
        });
        return { published: true };
      });

      return { episodeId, userId };
    } catch (error) {
      logError(log, error, "Episode generation failed", {
        episodeId,
        feedId,
        canonicalUrl,
        hasAuth: Boolean(sourceAuth),
      });
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

      const message = error instanceof Error ? error.message : "Unknown error";
      
      // Permanent errors that should NOT be retried
      const permanentErrorPatterns = [
        "Not enough article text to generate an episode",
        "Article exceeds 5MB limit",
        "exceeds 5MB limit",
        "Content too large",
        "URL not allowed",
        "Hostname not allowed",
        "IP address not allowed",
        "Protocol not allowed",
      ];
      
      const isPermanent =
        permanentErrorPatterns.some(pattern => message.includes(pattern)) ||
        (error instanceof FetchError && [401, 403, 404, 410].includes(error.status));

      if (shouldThrow && !isPermanent) {
        throw error;
      }
      return { failed: true };
    }
  }
);

export const functions = [generateEpisode];
