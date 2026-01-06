import { Inngest } from "inngest";
import Parser from "rss-parser";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
      ? "Write as a two-host conversation. Label speakers as Host 1 and Host 2. Plain text only."
      : format === "tldr"
        ? "Write as a tight TL;DR recap with punchy narration, still 500-900 words. Plain text only."
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

export const generateEpisode = inngest.createFunction(
  { id: "episode-generate" },
  { event: "episode/generate.requested" },
  async ({ event, step }) => {
    const { userId, siteId, sourceId, episodeId, canonicalUrl, episodeTitle, format } =
      event.data as {
        userId: string;
        siteId: string;
        sourceId: string;
        episodeId: string;
        canonicalUrl?: string;
        episodeTitle?: string;
        format?: string;
      };

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

      const source = await step.run("load-source", async () => {
        const record = await prisma.source.findFirst({
          where: { id: sourceId, siteId },
          select: { id: true, type: true, url: true, displayName: true },
        });
        if (!record) {
          throw new Error("Source not found");
        }
        return record;
      });

      const resolved = await step.run("resolve-source", async () => {
        if (canonicalUrl) {
          return {
            canonicalUrl,
            episodeTitle: episodeTitle || "Latest Episode",
            latestItemTitle: episodeTitle || "Latest Episode",
            latestItemUrl: canonicalUrl,
            feedTitle: null,
          };
        }
        if (source.type === "RSS") {
          const latest = await fetchLatestFromRss(source.url);
          return {
            canonicalUrl: latest.link,
            episodeTitle: latest.title,
            latestItemTitle: latest.title,
            latestItemUrl: latest.link,
            feedTitle: latest.feedTitle,
          };
        }
        return {
          canonicalUrl: source.url,
          episodeTitle: "Latest Episode",
          latestItemTitle: null,
          latestItemUrl: null,
          feedTitle: null,
        };
      });

      await step.run("update-source-meta", async () => {
        await prisma.source.update({
          where: { id: source.id },
          data: {
            latestItemTitle: resolved.latestItemTitle,
            latestItemUrl: resolved.latestItemUrl,
            displayName: resolved.feedTitle || source.displayName || undefined,
            lastFetchStatus: "success",
            lastError: null,
            lastFetchedAt: new Date(),
          },
        });
      });

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
        const { script, chapters } = await generateScriptAndChapters(
          resolved.episodeTitle,
          resolved.canonicalUrl,
          readableText,
          format
        );
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            title: resolved.episodeTitle,
            sourceUrl: resolved.canonicalUrl,
            scriptText: script,
            transcriptText: script,
            chaptersJson: chapters,
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
        const voice = process.env.OPENAI_TTS_VOICE || "marin";
        const chunks = chunkText(episode.scriptText, 3500);
        const buffers: Buffer[] = [];
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

        await prisma.source.update({
          where: { id: sourceId },
          data: {
            lastFetchStatus: "fail",
            lastError: error instanceof Error ? error.message : "Unknown error",
          },
        });
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
