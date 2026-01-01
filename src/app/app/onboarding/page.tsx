import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import OnboardingClient from "@/app/app/onboarding/onboarding-client";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <OnboardingClient />;
}
