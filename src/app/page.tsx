import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-6 py-16">
        <header className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="text-[12px] font-medium text-muted-foreground">ListenLayer</div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Turn written posts into calm, clear audio.
              </h1>
              <p className="max-w-2xl text-[15px] text-muted-foreground">
                Connect a site or feed, choose a format, and publish a player in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/app">Open app</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>What you get</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[13px] text-muted-foreground">
              <div>
                <div className="text-[13px] font-semibold text-foreground">Scripts + chapters</div>
                Clear narration with a simple structure.
              </div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">Hosted audio</div>
                MP3 delivery with secure playback URLs.
              </div>
              <div>
                <div className="text-[13px] font-semibold text-foreground">Embed + insights</div>
                Drop in a player and see what listeners finish.
              </div>
            </CardContent>
          </Card>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Publish fast",
              copy: "Generate 3–6 minute episodes with scripts, chapters, and safe audio hosting.",
            },
            {
              title: "Embed anywhere",
              copy: "Drop an iframe or widget.js snippet into any page to ship a player.",
            },
            {
              title: "Measure listens",
              copy: "Track plays and completion milestones in your dashboard.",
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
