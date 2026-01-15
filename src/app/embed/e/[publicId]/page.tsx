import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AudioPlayer } from "@/components/audio-player";
import { embedHeight } from "@/lib/embed";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const episode = await prisma.episode.findUnique({
    where: { publicId },
  });

  if (!episode || episode.status !== "PUBLISHED") {
    notFound();
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-transparent px-4 py-3">
      <style>{`body{background:transparent!important;color:var(--foreground,#0a0a0a);}@media (prefers-color-scheme: dark){body{color:#f5f5f5;}}`}</style>
      <div className="w-full max-w-3xl space-y-2" style={{ minHeight: embedHeight() }}>
        <div className="flex items-center justify-end">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-display text-sm tracking-tight">ListenLayer</span>
          </a>
        </div>
        <AudioPlayer publicId={episode.publicId} />
      </div>
    </div>
  );
}
