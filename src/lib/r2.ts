import { S3Client, GetObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Redis } from "@upstash/redis";

// Cache R2 config and client to avoid recreation on every call
let cachedConfig: { accessKeyId: string; secretAccessKey: string; bucket: string; endpoint: string } | null = null;
let cachedClient: S3Client | null = null;

// Redis client for URL caching
const isUpstashConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function getR2Config() {
  if (cachedConfig) return cachedConfig;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error("Missing R2 configuration");
  }

  cachedConfig = { accessKeyId, secretAccessKey, bucket, endpoint };
  return cachedConfig;
}

export function getR2Client() {
  if (cachedClient) return cachedClient;

  const { accessKeyId, secretAccessKey, endpoint } = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export function getR2Bucket() {
  return getR2Config().bucket;
}

/**
 * Get a presigned URL for an audio file, with Redis caching.
 * URLs are cached for TTL minus 5 minutes to ensure they're still valid when served.
 */
export async function getPresignedAudioUrl(key: string, expiresInSeconds = 21600) {
  // Try to get cached URL first
  if (redis) {
    const cacheKey = `audio-url:${key}`;
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore cache errors, fall through to generate URL
    }
  }

  // Generate new presigned URL
  const client = getR2Client();
  const bucket = getR2Bucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  // Cache the URL (TTL minus 5 minutes buffer)
  if (redis) {
    const cacheTtl = Math.max(60, expiresInSeconds - 300); // At least 1 minute
    try {
      await redis.setex(`audio-url:${key}`, cacheTtl, url);
    } catch {
      // Ignore cache write errors
    }
  }

  return url;
}

export async function deleteAudioObjects(keys: string[]) {
  if (keys.length === 0) return;
  const client = getR2Client();
  const bucket = getR2Bucket();
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}
