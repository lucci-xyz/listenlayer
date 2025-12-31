import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function hasFfmpeg() {
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

export async function maybeNormalizeMp3(buffer: Buffer) {
  const available = await hasFfmpeg();
  if (!available) return buffer;

  const inputPath = join(tmpdir(), `listenlayer-input-${Date.now()}.mp3`);
  const outputPath = join(tmpdir(), `listenlayer-output-${Date.now()}.mp3`);

  try {
    await fs.writeFile(inputPath, buffer);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-af",
      "loudnorm",
      outputPath,
    ]);
    const normalized = await fs.readFile(outputPath);
    return normalized;
  } catch {
    return buffer;
  } finally {
    await fs.rm(inputPath, { force: true });
    await fs.rm(outputPath, { force: true });
  }
}
