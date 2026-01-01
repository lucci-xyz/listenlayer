import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { SidebarNav } from "@/app/app/sidebar-nav";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex min-h-screen">
        <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white px-5 py-6">
          <div className="text-lg font-semibold text-zinc-900">ListenLayer</div>
          <p className="mt-1 text-xs uppercase tracking-widest text-zinc-400">Dashboard</p>
          <div className="mt-6">
            <SidebarNav />
          </div>
          <div className="mt-auto space-y-3 text-sm text-zinc-500">
            <div className="rounded-lg bg-zinc-100 px-3 py-2">
              <div className="text-xs uppercase text-zinc-400">Signed in</div>
              <div className="truncate text-sm text-zinc-700">{user.email}</div>
            </div>
            {process.env.DEV_AUTH_BYPASS === "true" ? null : <SignOutButton />}
          </div>
        </aside>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
