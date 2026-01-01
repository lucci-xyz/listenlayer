import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AudioPlayer } from "@/components/audio-player";
import {
  embedConfigToQuery,
  mergeEmbedConfig,
  parseEmbedConfigSearchParams,
} from "@/lib/embed";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicId } = await params;
  const resolvedParams = await searchParams;
  const episode = await prisma.episode.findUnique({
    where: { publicId },
    include: { site: true },
  });

  if (!episode || episode.status !== "PUBLISHED") {
    notFound();
  }

  const overrides = parseEmbedConfigSearchParams(resolvedParams);
  const config = mergeEmbedConfig(episode.site.embedConfig, overrides);
  const query = embedConfigToQuery(config);

  const themeClass =
    config.theme === "dark"
      ? "bg-zinc-900 text-zinc-100 border-zinc-800"
      : "bg-white text-zinc-900 border-zinc-200";
  const mutedClass =
    config.theme === "auto"
      ? "embed-muted text-zinc-500"
      : config.theme === "dark"
        ? "text-zinc-400"
        : "text-zinc-500";
  const radiusClass =
    config.radius === "round"
      ? "rounded-2xl"
      : config.radius === "sharp"
        ? "rounded-none"
        : "rounded-lg";
  const sizeClass =
    config.size === "compact"
      ? "min-h-[120px]"
      : config.size === "tall"
        ? "min-h-[220px]"
        : "min-h-[160px]";

  return (
    <div className={`flex h-full ${sizeClass} items-center justify-center px-4 py-4`}>
      {config.theme === "auto" ? (
        <style>{`@media (prefers-color-scheme: dark){.embed-auto{background:#0b0b0b;color:#f4f4f5;border-color:#27272a}.embed-auto .embed-muted{color:#a1a1aa}}`}</style>
      ) : null}
      <div
        className={`embed-shell embed-auto w-full max-w-xl border ${radiusClass} ${config.theme === "auto" ? "bg-white text-zinc-900 border-zinc-200" : themeClass}`}
        style={{ "--accent": config.accentColor } as CSSProperties}
      >
        <div className="px-4 py-3">
          <div className={`text-xs uppercase tracking-widest ${mutedClass}`}>ListenLayer</div>
          <div className="text-sm font-semibold">{episode.title}</div>
          <div className={`text-xs ${mutedClass}`}>{episode.site.name}</div>
          <div className="mt-2">
            <AudioPlayer publicId={episode.publicId} />
          </div>
          {(config.showChapters || config.showTranscript || config.showOpenPlayer) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {config.showChapters ? (
                <a
                  className="rounded-full border px-3 py-1"
                  style={{ borderColor: config.accentColor, color: config.accentColor }}
                  href={`/listen/e/${episode.publicId}?${query}#chapters`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Chapters
                </a>
              ) : null}
              {config.showTranscript ? (
                <a
                  className="rounded-full border px-3 py-1"
                  style={{ borderColor: config.accentColor, color: config.accentColor }}
                  href={`/listen/e/${episode.publicId}?${query}#transcript`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Transcript
                </a>
              ) : null}
              {config.showOpenPlayer ? (
                <a
                  className="rounded-full border px-3 py-1"
                  style={{ borderColor: config.accentColor, color: config.accentColor }}
                  href={`/listen/e/${episode.publicId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open player
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
