import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AudioPlayer } from "@/components/audio-player";
import { getDomainFromUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

export default async function ListenPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const episode = await prisma.episode.findUnique({
    where: { publicId },
    include: { feed: true },
  });

  if (!episode || episode.status !== "PUBLISHED") {
    notFound();
  }

  const chapters = (Array.isArray(episode.chaptersJson)
    ? episode.chaptersJson
    : []) as { title: string; startApproxSec: number }[];

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Back button */}
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-soft">
          <div className="text-[12px] font-medium text-muted-foreground">ListenLayer</div>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">{episode.title}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {episode.feed?.name || getDomainFromUrl(episode.sourceUrl)}
          </p>
          <div className="mt-4">
            <AudioPlayer publicId={episode.publicId} />
          </div>
        </div>
        <div id="chapters" className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Chapters</h2>
          {chapters.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted-foreground">No chapters available yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
              {chapters.map((chapter, index) => (
                <li key={`${chapter.title}-${index}`}>
                  <span className="font-semibold text-foreground">{chapter.title}</span>
                  <span className="ml-2 text-[12px] text-muted-foreground">
                    ~{chapter.startApproxSec}s
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div id="transcript" className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Transcript</h2>
          <p className="mt-3 whitespace-pre-wrap text-[13px] text-muted-foreground">
            {episode.transcriptText}
          </p>
        </div>
      </div>
    </div>
  );
}
