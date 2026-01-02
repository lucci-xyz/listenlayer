import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
        <header className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              ListenLayer
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Turn written posts into narrated audio.
              </h1>
              <p className="max-w-2xl text-[15px] text-muted-foreground">
                ListenLayer pulls from your site or feed, scripts a tight summary,
                and ships a hosted player with embed-ready audio in minutes.
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
          </div>
          <Card className="rounded-2xl shadow-soft-md">
            <CardHeader>
              <CardTitle>What you get</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[13px] text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-center text-[13px] font-semibold text-primary">
                  01
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">Script + chapters</div>
                  Structured narration with clear takeaways and CTA.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-center text-[13px] font-semibold text-primary">
                  02
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">Safe audio hosting</div>
                  MP3s stored in R2 with secure, signed playback URLs.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-center text-[13px] font-semibold text-primary">
                  03
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">Embeds + analytics</div>
                  Iframe, widget.js, and playback milestones.
                </div>
              </div>
            </CardContent>
          </Card>
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
              <CardContent className="text-[13px] text-muted-foreground">
                {item.copy}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
