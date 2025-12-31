import { Inngest } from "inngest";
import Parser from "rss-parser";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { extractReadableText } from "@/lib/content";
import { chunkText, estimateDurationSec, extractJsonObject } from "@/lib/text";
import { openai } from "@/lib/openai";
import { getR2Client, getR2Bucket } from "@/lib/r2";
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

async function generateScriptAndChapters(title: string, url: string, text: string) {
  const trimmed = text.slice(0, 12000);
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    input: [
      {
        role: "system",
        content:
          "You are a podcast script writer. Only use the provided article text. Do not add outside facts. Return JSON only, with keys 'script' and 'chapters'. 'script' must be plain text, 500-900 words, 3-6 minutes. 'chapters' is an array of {title, startApproxSec} with ascending start times.",
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
    const rawChapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
    const chapters = rawChapters
      .filter((chapter) => chapter && typeof chapter.title === "string")
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
    const { userId, siteId, sourceId, episodeId } = event.data as {
      userId: string;
      siteId: string;
      sourceId: string;
      episodeId: string;
    };

    try {
      await step.run("mark-running", async () => {
        await prisma.episode.update({
          where: { id: episodeId },
          data: { status: "RUNNING" },
        });
      });

      const source = await step.run("load-source", async () => {
        const record = await prisma.source.findFirst({
          where: { id: sourceId, siteId },
        });
        if (!record) {
          throw new Error("Source not found");
        }
        return record;
      });

      const { canonicalUrl, episodeTitle } = await step.run("resolve-source", async () => {
        if (source.type === "RSS") {
          const latest = await fetchLatestFromRss(source.url);
          return { canonicalUrl: latest.link, episodeTitle: latest.title };
        }
        return { canonicalUrl: source.url, episodeTitle: "Latest Episode" };
      });

      const html = await step.run("fetch-html", async () => {
        return fetchHtml(canonicalUrl);
      });

      const readableText = await step.run("extract-text", async () => {
        const text = extractReadableText(html, canonicalUrl);
        if (!text || text.length < 200) {
          throw new Error("Extracted text too short");
        }
        return text;
      });

      const { script, chapters } = await step.run("generate-script", async () => {
        return generateScriptAndChapters(episodeTitle, canonicalUrl, readableText);
      });

      const uploadKey = await step.run("generate-and-upload-audio", async () => {
        const voice = process.env.OPENAI_TTS_VOICE || "marin";
        const chunks = chunkText(script, 3500);
        const buffers: Buffer[] = [];
        for (const chunk of chunks) {
          const audio = await openai.audio.speech.create({
            model: "gpt-4o-mini-tts",
            voice,
            input: chunk,
            format: "mp3",
          });
          const buffer = Buffer.from(await audio.arrayBuffer());
          buffers.push(buffer);
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

      await step.run("update-episode", async () => {
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            title: episodeTitle,
            sourceUrl: canonicalUrl,
            status: "PUBLISHED",
            scriptText: script,
            transcriptText: script,
            chaptersJson: chapters,
            audioObjectKey: uploadKey,
            durationSec: estimateDurationSec(script),
            publishedAt: new Date(),
            errorMessage: null,
          },
        });

        await prisma.source.update({
          where: { id: sourceId },
          data: { lastFetchedAt: new Date() },
        });
      });

      return { episodeId, userId };
    } catch (error) {
      await step.run("mark-failed", async () => {
        await prisma.episode.update({
          where: { id: episodeId },
          data: {
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        });
      });

      throw error;
    }
  }
);

export const functions = [generateEpisode];
