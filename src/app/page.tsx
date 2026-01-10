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

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-semibold">
              L
            </div>
            <span className="text-[15px] font-medium">ListenLayer</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="#pricing">Pricing</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero — two-column layout */}
      <section className="relative overflow-hidden">
        {/* Subtle orb background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] orb-glow -z-10" />
        
        <div className="mx-auto max-w-[1200px] px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left: copy */}
            <div className="max-w-xl">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
                Audio for blogs & newsletters
              </p>
              <h1 className="font-display text-[3.25rem] leading-[1.05] tracking-tight lg:text-[3.75rem]">
                Turn any article into an audio episode
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Paste a URL. We extract the text, generate narration, and give you 
                a player to embed. Your readers can listen while they commute, cook, 
                or pretend to work out.
              </p>
              
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild className="h-11 px-5 text-[15px]">
                  <Link href="/login">
                    Start free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-11 px-5 text-[15px]">
                  <Link href="#demo">
                    <Play className="mr-2 h-3.5 w-3.5" /> Listen to a sample
                  </Link>
                </Button>
              </div>
              
              <p className="mt-4 text-sm text-muted-foreground">
                3 free episodes · No card required
              </p>
            </div>

            {/* Right: mock player visual */}
            <div className="relative lg:pl-8">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-soft-lg">
                {/* Mock player header */}
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center shrink-0">
                    <Play className="h-6 w-6 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      How We Redesigned Our Checkout Flow
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      The Design Blog · 8 min
                    </div>
                  </div>
                </div>
                
                {/* Mock waveform */}
                <div className="mt-6 flex items-center gap-1">
                  {[...Array(40)].map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 rounded-full bg-violet-500/20"
                      style={{ 
                        height: `${Math.random() * 24 + 8}px`,
                        backgroundColor: i < 12 ? 'rgb(124 58 237 / 0.5)' : undefined
                      }}
                    />
                  ))}
                </div>
                
                {/* Mock controls */}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>2:34</span>
                  <span>8:12</span>
                </div>
              </div>
              
              {/* Floating badge */}
              <div className="absolute -bottom-8 -left-4 rounded-xl border border-border bg-card px-4 py-3 shadow-soft-md">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">1,247 plays this week</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — narrative section */}
      <section className="border-t border-border/50 py-24 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              How it works
            </p>
            <h2 className="font-display text-[2.5rem] tracking-tight">
              Three steps to audio content
            </h2>
          </div>
          
          <div className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-8">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold">
                1
              </div>
              <h3 className="mt-5 text-lg font-medium">Paste your URL</h3>
              <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
                Drop in any blog post, newsletter, or article link. 
                We'll extract the text and clean it up for narration.
              </p>
            </div>
            
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold">
                2
              </div>
              <h3 className="mt-5 text-lg font-medium">Generate audio</h3>
              <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
                Our system creates narration with natural pacing. 
                The result: an MP3 file ready to share in a few minutes.
              </p>
            </div>
            
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold">
                3
              </div>
              <h3 className="mt-5 text-lg font-medium">Embed & track</h3>
              <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">
                Copy a snippet, drop it on your site. 
                See how many people press play and how long they listen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — asymmetric layout */}
      <section className="bg-muted/30 py-24 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
            {/* Left: main feature */}
              <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                For newsletters & blogs
              </p>
              <h2 className="font-display text-[2.5rem] tracking-tight">
                Your writing, now with an audio option
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Not everyone has time to read. Some prefer listening while doing 
                other things. Give them the choice without recording anything yourself.
              </p>
              <p className="mt-4 text-sm text-muted-foreground italic">
                Great for newsletters and blogs. Overkill for audiobooks.
              </p>
              
              <div className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  Used by creators at Substack, Ghost, Beehiiv
                </span>
              </div>
            </div>
            
            {/* Right: feature list */}
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                {
                  icon: Rss,
                  title: "RSS auto-sync",
                  description: "Connect your feed once. New posts become audio automatically.",
                },
                {
                  icon: Code2,
                  title: "Simple embed",
                  description: "One line of code. Works on any site, any CMS.",
                },
                {
                  icon: BarChart3,
                  title: "Play analytics",
                  description: "See total plays, completion rates, and listener trends.",
                },
                {
                  icon: Play,
                  title: "Clean player",
                  description: "Minimal design that doesn't fight with your site's look.",
                },
              ].map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-border/70 bg-card p-5">
                  <feature.icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="mt-3 font-medium">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-center max-w-xl mx-auto">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              Pricing
            </p>
            <h2 className="font-display text-[2.5rem] tracking-tight">
              Start free, scale as you grow
            </h2>
            <p className="mt-4 text-muted-foreground">
              All plans include the embed player and basic analytics. 
              Upgrade for more episodes and features.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {(["free", "creator", "pro", "business"] as const).map((key) => {
              const plan = PLANS[key];
              const isPopular = key === "creator";
              return (
                <div
                  key={key}
                  className={`relative rounded-2xl border border-border/70 bg-card p-6 ${
                    isPopular ? "shadow-soft-lg border-2 border-foreground" : ""
                  }`}
                >
                  {isPopular && (
                    <Badge className="absolute top-0 left-6 -translate-y-1/2 bg-background">
                      Popular
                    </Badge>
                  )}
                  <div className="text-sm font-medium text-muted-foreground">{plan.name}</div>
                  <div className="mt-3">
                    <span className="text-3xl font-semibold">
                      {plan.price === 0 ? "$0" : `$${plan.price}`}
                    </span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    variant={key === "free" ? "outline" : isPopular ? "default" : "outline"}
                    className="w-full mt-6"
                    asChild
                  >
                    <Link href="/login">
                      {key === "free" ? "Get started" : "Start free trial"}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/50 bg-foreground text-background py-20">
        <div className="mx-auto max-w-[1200px] px-6 text-center">
          <h2 className="font-display text-[2.25rem] tracking-tight">
            Ready to add audio to your site?
          </h2>
          <p className="mt-3 text-background/70 max-w-md mx-auto">
            Takes about 2 minutes to set up. No technical knowledge required.
          </p>
          <Button size="lg" variant="secondary" asChild className="mt-8 h-11 px-6 text-[15px]">
            <Link href="/login">
              Create your first episode <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background text-[10px] font-semibold">
                L
              </div>
              <span className="text-sm font-medium">ListenLayer</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
