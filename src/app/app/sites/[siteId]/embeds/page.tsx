import { redirect } from "next/navigation";

export default async function EmbedsRedirectPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  redirect(`/app/sites/${siteId}/style`);
}
