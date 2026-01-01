import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AudioPlayer } from "@/components/audio-player";

export const dynamic = "force-dynamic";

export default async function ListenPage({
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
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm uppercase tracking-widest text-zinc-400">ListenLayer</div>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{episode.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{episode.site.name}</p>
          <div className="mt-4">
            <AudioPlayer publicId={episode.publicId} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Transcript</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">
            {episode.transcriptText}
          </p>
        </div>
      </div>
    </div>
  );
}
