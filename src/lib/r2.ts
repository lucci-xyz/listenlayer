import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
    throw new Error("Missing R2 configuration");
  }

  return { accessKeyId, secretAccessKey, bucket, endpoint };
}

export function getR2Client() {
  const { accessKeyId, secretAccessKey, endpoint } = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getR2Bucket() {
  return getR2Config().bucket;
}

export async function getPresignedAudioUrl(key: string, expiresInSeconds = 21600) {
  const client = getR2Client();
  const bucket = getR2Bucket();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
