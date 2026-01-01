import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AudioPlayer } from "@/components/audio-player";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const episode = await prisma.episode.findUnique({
    where: { publicId },
    include: { site: true },
  });

  if (!episode || episode.status !== "PUBLISHED") {
    notFound();
  }

  return (
    <div className="flex h-full min-h-[160px] items-center justify-center bg-white px-4">
      <div className="w-full max-w-xl">
        <div className="text-xs uppercase tracking-widest text-zinc-400">ListenLayer</div>
        <div className="text-sm font-semibold text-zinc-800">{episode.title}</div>
        <div className="text-xs text-zinc-500">{episode.site.name}</div>
        <div className="mt-2">
          <AudioPlayer publicId={episode.publicId} />
        </div>
      </div>
    </div>
  );
}
