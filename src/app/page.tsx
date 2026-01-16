import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight,
  Play,
  Rss,
  Code2,
  BarChart3,
  Check,
} from "lucide-react";
import { PLANS } from "@/lib/stripe";
import { LandingAudioPlayer } from "@/components/landing-audio-player";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold tracking-tight">ListenLayer.</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="#pricing">Pricing</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="rounded-full px-6" asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero — two-column layout */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 items-center">
            {/* Left: copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground mb-8">
                Audio for blogs & newsletters
              </div>
              <h1 className="font-display text-5xl leading-[1.1] tracking-tight md:text-6xl lg:text-[4rem] text-foreground mb-8">
                Turn any article into an audio episode
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-md">
                Paste a URL. We extract the text, generate narration, and give you 
                a player to embed. Your readers can listen while they commute, cook, 
                or pretend to work out.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-sm" asChild>
                  <Link href="/login">
                    Start free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base bg-background/80 border-border/60 hover:bg-muted/50" asChild>
                  <Link href="#demo">
                    <Play className="mr-2 h-4 w-4 fill-current" /> Listen to sample
                  </Link>
                </Button>
              </div>
              
              <p className="mt-6 text-sm text-muted-foreground font-medium">
                3 free episodes · No card required
              </p>
            </div>

            <div id="demo" className="relative">
              <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft-lg">
                <Badge className="mb-4" variant="secondary">Sample episode</Badge>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    The role of music in society
                  </div>
                  <div className="text-2xl font-display text-foreground">
                    Sir Hugh Percy Allen (1934)
                  </div>
                  <div className="text-sm text-muted-foreground">
                    4 min 16 sec · Public domain recording
                  </div>
                </div>

                <div className="mt-6">
                  <LandingAudioPlayer
                    src="https://commons.wikimedia.org/wiki/Special:FilePath/Sir-hugh-allen-speech.mp3"
                    durationLabel="4:16"
                  />
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Source: Wikimedia Commons (public domain).
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 md:py-32 bg-card rounded-2xl mx-4 md:mx-6 shadow-soft border border-border/60 mb-6">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
              Three steps to audio content
            </h2>
            <p className="text-lg text-muted-foreground">
              Transforming your written content into high-quality audio has never been easier.
            </p>
          </div>
          
          <div className="grid gap-12 md:grid-cols-3 relative">
            {/* Connecting line */}
            <div className="absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent hidden md:block" />
            
            {[
              {
                step: "01",
                title: "Paste URL",
                desc: "Drop in any blog post, newsletter, or article link. We'll extract the text automatically."
              },
              {
                step: "02",
                title: "Generate Audio",
                desc: "Our AI creates natural-sounding narration in minutes. Choose from multiple voices."
              },
              {
                step: "03",
                title: "Embed & Track",
                desc: "Copy a snippet to your site. Track plays and engagement with built-in analytics."
              }
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 border border-border/60 font-mono text-lg font-medium text-muted-foreground mb-6 relative z-10">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-start">
            <div>
              <div className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-medium text-foreground mb-8">
                Features
              </div>
              <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
                Your writing, now with an audio option
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Not everyone has time to read. Give them the choice to listen
                without recording anything yourself. Perfect for newsletters and blogs.
              </p>
            </div>

            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {[
                {
                  icon: Rss,
                  title: "RSS Auto-sync",
                  desc: "New posts become audio automatically."
                },
                {
                  icon: Code2,
                  title: "Simple Embed",
                  desc: "One line of code. Works on any CMS."
                },
                {
                  icon: BarChart3,
                  title: "Deep Analytics",
                  desc: "Track plays, completion rates, and more."
                },
                {
                  icon: Play,
                  title: "Clean Player",
                  desc: "Minimal design that fits your brand."
                },
              ].map((feature, i) => (
                <div key={i}>
                  <feature.icon className="h-6 w-6 text-primary mb-4" strokeWidth={1.5} />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 bg-card mx-4 md:mx-6 rounded-2xl shadow-soft border border-border/60 mb-6">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
              Start free, scale as you grow
            </h2>
            <p className="text-lg text-muted-foreground">
              All plans include the embed player and basic analytics. 
              Upgrade for more episodes and features.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(["free", "creator", "pro", "business"] as const).map((key) => {
              const plan = PLANS[key];
              const isPopular = key === "creator";
              return (
                <div
                  key={key}
                  className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${
                    isPopular 
                      ? "bg-primary/5 border-primary/30 shadow-soft-md" 
                      : "bg-card border-border/60 hover:border-border"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/10 text-primary border border-primary/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Popular
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-sm mt-1 text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  
                  <div className="mb-8">
                    <span className="font-display text-4xl">
                      {plan.price === 0 ? "$0" : `$${plan.price}`}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" strokeWidth={2} />
                        <span className="text-foreground/80">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    variant={isPopular ? "default" : "outline"}
                    className="w-full rounded-full h-12"
                    asChild
                  >
                    <Link href={key === "free" ? "/login" : `/login?plan=${key}`}>
                      {key === "free" ? "Get started" : "Start trial"}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/60">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight">ListenLayer.</span>
            </div>
            <div className="flex items-center gap-8 text-sm font-medium text-muted-foreground">
              <Link href="#pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Sign in
              </Link>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
