import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EmbedPreviewClient from "@/app/app/embed-preview/preview-client";

export const dynamic = "force-dynamic";

function getBaseUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export default async function EmbedPreviewPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const episodes = await prisma.episode.findMany({
    where: { site: { userId: user.id }, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <EmbedPreviewClient
      baseUrl={getBaseUrl()}
      episodes={episodes.map((episode) => ({
        id: episode.id,
        title: episode.title,
        publicId: episode.publicId,
      }))}
    />
  );
}
