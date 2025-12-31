export function chunkText(text: string, maxLength: number) {
  const chunks: string[] = [];
  let cursor = 0;
  const normalized = text.replace(/\s+/g, " ").trim();

  while (cursor < normalized.length) {
    const end = Math.min(cursor + maxLength, normalized.length);
    let sliceEnd = end;
    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", end);
      if (lastSpace > cursor + Math.floor(maxLength * 0.6)) {
        sliceEnd = lastSpace;
      }
    }
    chunks.push(normalized.slice(cursor, sliceEnd).trim());
    cursor = sliceEnd + 1;
  }

  return chunks.filter(Boolean);
}

export function estimateDurationSec(text: string, wordsPerMinute = 150) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(30, Math.ceil((words / wordsPerMinute) * 60));
}

export function extractJsonObject(text: string) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("No JSON object found");
  }
  const slice = text.slice(first, last + 1);
  return JSON.parse(slice);
}
