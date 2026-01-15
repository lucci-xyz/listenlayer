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
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
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
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24 items-center">
            {/* Left: copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full bg-white/40 px-3 py-1 text-xs font-medium text-foreground/80 mb-8 backdrop-blur-sm">
                Audio for blogs & newsletters
              </div>
              <h1 className="font-display text-5xl leading-[1.1] tracking-tight md:text-6xl lg:text-[4rem] text-foreground mb-8">
                Turn any article into an audio episode
              </h1>
              <p className="text-lg md:text-xl text-foreground/70 leading-relaxed mb-10 max-w-md">
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
                <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base bg-white/50 border-white/40 hover:bg-white/80" asChild>
                  <Link href="#demo">
                    <Play className="mr-2 h-4 w-4 fill-current" /> Listen to sample
                  </Link>
                </Button>
              </div>
              
              <p className="mt-6 text-sm text-foreground/50 font-medium">
                3 free episodes · No card required
              </p>
            </div>

            {/* Right: mock player visual */}
            <div className="relative hidden lg:block">
              <div className="relative z-10 rounded-[2rem] bg-white p-8 shadow-xl shadow-black/5 ring-1 ring-black/5 transition-transform duration-500 ease-out">
                {/* Mock player header */}
                <div className="flex items-start gap-5">
                  <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0 text-accent-foreground">
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="font-display text-2xl text-foreground mb-1 leading-tight">
                      How We Redesigned Our Checkout Flow
                    </div>
                    <div className="text-sm font-medium text-foreground/50">
                      The Design Blog · 8 min listen
                    </div>
                  </div>
                </div>
                
                {/* Mock waveform */}
                <div className="mt-8 flex items-end justify-between gap-1 h-12">
                  {[...Array(40)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 rounded-full transition-all duration-500"
                      style={{ 
                        height: `${Math.max(20, Math.random() * 100)}%`,
                        backgroundColor: i < 15 ? 'var(--primary)' : 'rgba(0,0,0,0.06)'
                      }}
                    />
                  ))}
                </div>
                
                {/* Mock controls */}
                <div className="mt-6 flex items-center justify-between text-xs font-medium text-foreground/40 font-mono tracking-wider">
                  <span>02:34</span>
                  <span>08:12</span>
                </div>
              </div>
              
              {/* Decorative elements behind */}
              <div className="absolute -inset-4 bg-primary/5 rounded-[2.5rem] -z-10 scale-95" />
              <div className="absolute -inset-8 bg-white/20 rounded-[3rem] -z-20 scale-90" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 md:py-32 bg-white rounded-[2.5rem] mx-4 md:mx-6 shadow-sm mb-6">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
              Three steps to audio content
            </h2>
            <p className="text-lg text-foreground/60">
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
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border font-mono text-lg font-medium text-foreground/60 mb-6 relative z-10">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-foreground/60 leading-relaxed max-w-xs">
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
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center rounded-full bg-white/40 px-3 py-1 text-xs font-medium text-foreground/80 mb-8">
                Features
              </div>
              <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
                Your writing, now with an audio option
              </h2>
              <p className="text-lg text-foreground/70 leading-relaxed mb-12">
                Not everyone has time to read. Give them the choice to listen 
                without recording anything yourself. Perfect for newsletters and blogs.
              </p>
              
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
            
            <div className="relative lg:h-[600px] rounded-[2.5rem] bg-white p-8 md:p-12 shadow-xl shadow-black/5 ring-1 ring-black/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 via-transparent to-transparent" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground/40 uppercase tracking-widest mb-2">Now Playing</div>
                  <div className="font-display text-3xl mb-2">The Future of Digital Media</div>
                  <div className="text-foreground/60">Tech Daily · Episode 42</div>
                </div>
                
                <div className="space-y-6">
                  <div className="h-32 flex items-end gap-1 opacity-80">
                    {[...Array(50)].map((_, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-foreground/10 rounded-full"
                        style={{ height: `${20 + Math.random() * 80}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-center gap-8">
                    {/* Mock controls */}
                    <div className="h-12 w-12 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-secondary cursor-pointer transition-colors">
                      <div className="w-4 h-4 border-l-2 border-b-2 border-foreground rotate-45 ml-1" />
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform cursor-pointer">
                      <div className="w-3 h-3 bg-current rounded-sm" />
                    </div>
                    <div className="h-12 w-12 rounded-full border border-foreground/10 flex items-center justify-center hover:bg-secondary cursor-pointer transition-colors">
                      <div className="w-4 h-4 border-r-2 border-b-2 border-foreground -rotate-45 mr-1" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 bg-white mx-4 md:mx-6 rounded-[2.5rem] shadow-sm mb-6">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6">
              Start free, scale as you grow
            </h2>
            <p className="text-lg text-foreground/60">
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
                  className={`relative flex flex-col p-8 rounded-[2rem] transition-all duration-300 ${
                    isPopular 
                      ? "bg-primary text-primary-foreground shadow-2xl scale-105 z-10" 
                      : "bg-secondary/50 hover:bg-secondary border border-border"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Popular
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <h3 className={`font-semibold text-lg ${isPopular ? "text-primary-foreground" : "text-foreground"}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm mt-1 ${isPopular ? "text-primary-foreground/70" : "text-foreground/60"}`}>
                      {plan.description}
                    </p>
                  </div>
                  
                  <div className="mb-8">
                    <span className="font-display text-4xl">
                      {plan.price === 0 ? "$0" : `$${plan.price}`}
                    </span>
                    <span className={`text-sm ${isPopular ? "text-primary-foreground/70" : "text-foreground/60"}`}>/mo</span>
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className={`h-4 w-4 shrink-0 mt-0.5 ${isPopular ? "text-accent" : "text-primary"}`} strokeWidth={2} />
                        <span className={isPopular ? "text-primary-foreground/90" : "text-foreground/80"}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    variant={isPopular ? "secondary" : "outline"}
                    className={`w-full rounded-full h-12 ${
                      isPopular 
                        ? "bg-white text-primary hover:bg-white/90 border-transparent" 
                        : "bg-white border-border hover:bg-white/50"
                    }`}
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
      <footer className="py-12 border-t border-black/5">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight">ListenLayer.</span>
            </div>
            <div className="flex items-center gap-8 text-sm font-medium text-foreground/60">
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
