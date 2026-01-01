import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DeleteWorkspaceDialog } from "@/components/delete-workspace-dialog";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const sites = await prisma.site.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">Account and advanced workspace details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600">
          <div>Email: {user.email}</div>
          <div>Auth bypass: {process.env.DEV_AUTH_BYPASS === "true" ? "enabled" : "disabled"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {sites.map((site) => (
              <AccordionItem key={site.id} value={site.id}>
                <AccordionTrigger>{site.name}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm text-zinc-600">
                    <div>Domain: {site.domain || "Not set"}</div>
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                      <div className="text-xs font-semibold uppercase tracking-widest text-rose-500">
                        Danger zone
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-rose-600">
                          Delete this workspace and all connected content.
                        </p>
                        <DeleteWorkspaceDialog siteId={site.id} siteName={site.name} />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
