import { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/app" className="text-lg font-semibold">
            ListenLayer
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <Link className="text-zinc-700 hover:text-zinc-900" href="/app/embed-preview">
              Embed preview
            </Link>
            <span>{user.email}</span>
            {process.env.DEV_AUTH_BYPASS === "true" ? null : <SignOutButton />}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
