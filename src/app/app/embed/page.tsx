import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EmbedPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const site = await prisma.site.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (site) {
    redirect(`/app/sites/${site.id}/embeds`);
  }

  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm text-zinc-500">Create a site to customize embeds.</p>
        <Button asChild className="mt-4">
          <Link href="/app/onboarding">Add site</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
