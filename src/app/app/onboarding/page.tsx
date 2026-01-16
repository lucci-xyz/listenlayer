import { redirect } from "next/navigation";

// Onboarding is no longer needed - users paste URLs directly on the dashboard
export default function OnboardingPage() {
  redirect("/app");
}
