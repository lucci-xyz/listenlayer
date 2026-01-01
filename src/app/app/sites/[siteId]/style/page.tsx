import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mergeEmbedConfig } from "@/lib/embed";
import StyleClient from "@/app/app/sites/[siteId]/style/style-client";

export const dynamic = "force-dynamic";

export default async function StylePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const site = await prisma.site.findFirst({
    where: { id: siteId, userId: user.id },
  });

  if (!site) {
    redirect("/app");
  }

  const episode = await prisma.episode.findFirst({
    where: { siteId: site.id, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });

  const config = mergeEmbedConfig(site.embedConfig);

  return (
    <StyleClient
      siteId={site.id}
      initialConfig={config}
      previewPublicId={episode?.publicId || null}
    />
  );
}
