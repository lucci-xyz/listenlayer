import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16">
        <header className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
            ListenLayer MVP
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
              Turn written posts into narrated episodes.
            </h1>
            <p className="max-w-2xl text-lg text-zinc-600">
              ListenLayer pulls from RSS or URL sources, generates a narrated
              script, publishes an MP3, and gives you a hosted player + embed
              widgets in minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/app">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Publish fast",
              copy: "Generate 3–6 minute episodes with scripts, chapters, and audio stored safely in R2.",
            },
            {
              title: "Embed anywhere",
              copy: "Drop an iframe or widget.js snippet into any page to ship a player instantly.",
            },
            {
              title: "Measure listens",
              copy: "Track plays and completion milestones in your own dashboard—no external analytics.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-600">
                {item.copy}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
