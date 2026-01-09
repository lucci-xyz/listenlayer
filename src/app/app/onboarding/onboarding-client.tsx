"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ExternalLink,
  Loader2,
  Pencil,
  Rss,
  Clock,
  User,
  Calendar,
  Sparkles,
} from "lucide-react";

const formatOptions = [
  {
    id: "narration",
    title: "Narration",
    description: "Single host, clear storytelling.",
  },
  {
    id: "two-host",
    title: "Two-host conversation",
    description: "Dialogue format with two voices.",
  },
  {
    id: "tldr",
    title: "Quick recap",
    description: "Short, fast summary.",
  },
] as const;

type FormatId = (typeof formatOptions)[number]["id"];

type FeedSampleItem = {
  title?: string;
  url?: string;
  publishedAt?: string;
};

type FeedSummary = {
  url: string;
  title?: string;
  description?: string;
  type: "rss" | "atom";
  sampleItems?: FeedSampleItem[];
  itemCount?: number;
  latestItemTitle?: string;
};

type ArticlePreview = {
  title?: string;
  imageUrl?: string;
  excerpt?: string;
  author?: string;
  publishedAt?: string;
  readTimeMinutes?: number;
  siteName?: string;
};

type DiscoveryResult = {
  kind: "feed" | "article" | "website" | "unknown";
  confidence: "high" | "medium" | "low";
  inputUrl: string;
  canonicalUrl?: string;
  articlePreview?: ArticlePreview;
  feeds: FeedSummary[];
  recommendedFeedUrl?: string;
  platformHint?: string | null;
  origin: string;
  displayName: string;
  faviconUrl?: string | null;
};

type EpisodeStatus = "QUEUED" | "RUNNING" | "PUBLISHED" | "FAILED" | "CANCELLED";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "review" | "format" | "progress">("input");
  const [inputUrl, setInputUrl] = useState("");
  const [detectedUrl, setDetectedUrl] = useState("");
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<"sync" | "one-off" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [manualFeedUrl, setManualFeedUrl] = useState("");
  const [manualFeedError, setManualFeedError] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatId>("narration");
  const [progress, setProgress] = useState("Preparing...");
  const [episodeStatus, setEpisodeStatus] = useState<EpisodeStatus | null>(null);

  const resolveDefaultMode = (data: DiscoveryResult): "sync" | "one-off" | null => {
    if (data.kind === "feed" && (data.recommendedFeedUrl || data.feeds?.length)) {
      return "sync";
    }
    if (data.kind === "article") return "one-off";
    return null;
  };

  const applyDiscovery = (data: DiscoveryResult, usedUrl: string) => {
    setDiscovery(data);
    setDetectedUrl(usedUrl);
    setSelectedMode(resolveDefaultMode(data));
    setError(null);
    setManualFeedError(null);
    setSiteName(data.displayName || "New show");
    try {
      const hostname = new URL(data.origin).hostname;
      setSiteDomain(hostname);
    } catch {
      setSiteDomain("");
    }
  };

  const handleDiscovery = async (urlOverride?: string) => {
    const urlToCheck = (urlOverride ?? inputUrl).trim();
    if (!urlToCheck) return;
    setError(null);
    setManualFeedError(null);
    setLoadingDiscovery(true);
    setDiscovery(null);
    setSelectedMode(null);
    if (urlOverride && urlOverride !== inputUrl) {
      setInputUrl(urlOverride);
    }
    try {
      const res = await fetch("/api/sources/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToCheck }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to detect source");
      }
      const data = (await res.json()) as DiscoveryResult;
      const normalized = {
        ...data,
        feeds: data.feeds ?? [],
      };
      applyDiscovery(normalized, urlToCheck);
      return normalized;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
      return null;
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const handleContinue = async () => {
    if (!inputUrl.trim()) return;
    if (!discovery || inputUrl.trim() !== detectedUrl) {
      const result = await handleDiscovery();
      if (result) {
        setStep("review");
      }
      return;
    }
    setStep("review");
  };

  const handleManualFeed = async () => {
    if (!manualFeedUrl.trim()) return;
    const result = await handleDiscovery(manualFeedUrl.trim());
    if (!result || result.kind !== "feed") {
      setManualFeedError("We couldn't verify that feed. Double-check the URL.");
    }
  };

  const handleGenerate = async (modeOverride?: "one-off" | "sync") => {
    if (!discovery) return;
    const primaryFeed = discovery.feeds?.[0];
    const chosenMode = modeOverride ?? selectedMode ?? resolveDefaultMode(discovery);
    if (!chosenMode) {
      setError("Choose how you want to proceed first.");
      return;
    }
    setError(null);
    setStep("progress");
    setProgress(chosenMode === "sync" ? "Creating your workspace..." : "Preparing your audio...");

    const sourceType = chosenMode === "sync" ? "RSS" : "URL";
    let sourceUrl: string | undefined;

    if (chosenMode === "sync") {
      sourceUrl = discovery.recommendedFeedUrl || primaryFeed?.url;
    } else {
      // For one-off, use the canonical URL if it's an article
      // Or use the first feed item URL if we have a feed
      if (discovery.kind === "article" && discovery.canonicalUrl) {
        sourceUrl = discovery.canonicalUrl;
      } else if (primaryFeed?.sampleItems?.[0]?.url) {
        sourceUrl = primaryFeed.sampleItems[0].url;
      } else if (discovery.canonicalUrl) {
        sourceUrl = discovery.canonicalUrl;
      }
    }

    if (!sourceUrl) {
      setError("We couldn't use that link yet. Paste a specific post URL or a feed.");
      setStep("review");
      return;
    }

    try {
      const siteRes = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: siteName, domain: siteDomain }),
      });
      if (!siteRes.ok) throw new Error("Failed to create show");
      const siteData = await siteRes.json();
      const siteId = siteData.site.id as string;

      setProgress("Adding your source...");
      const sourceRes = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          type: sourceType,
          url: sourceUrl,
          displayName: discovery.displayName,
          faviconUrl: discovery.faviconUrl || undefined,
        }),
      });
      if (!sourceRes.ok) throw new Error("Failed to add source");
      const sourceData = await sourceRes.json();
      const sourceId = sourceData.source.id as string;

      setProgress("Queueing your first episode...");
      const episodeRes = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, sourceId, format }),
      });
      if (!episodeRes.ok) throw new Error("Failed to queue episode");
      const episodeData = await episodeRes.json();
      const episodeId = episodeData.episodeId as string;
      if (!episodeId) throw new Error("Failed to queue episode");

      setProgress("Generating audio. This can take a minute...");
      const poll = async () => {
        const res = await fetch(`/api/episodes/by-id/${episodeId}`);
        if (!res.ok) return;
        const data = await res.json();
        const status = data.episode?.status as EpisodeStatus;
        setEpisodeStatus(status);
        if (status === "PUBLISHED") {
          router.push(`/app/sites/${siteId}`);
          return;
        }
        if (status === "FAILED" || status === "CANCELLED") {
          setError(data.episode?.errorMessage || "Generation failed");
          return;
        }
        setTimeout(poll, 4000);
      };
      poll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    }
  };

  const preview = discovery?.articlePreview;
  const primaryFeed = discovery?.feeds?.[0];
  const hasFeed =
    discovery?.kind === "feed" &&
    Boolean(discovery.recommendedFeedUrl || primaryFeed?.url);
  const canSync = Boolean(hasFeed);
  const canOneOff =
    discovery?.kind === "article" ||
    Boolean(primaryFeed?.sampleItems?.[0]?.url);
  const canProceed =
    selectedMode === "sync"
      ? canSync
      : selectedMode === "one-off"
        ? canOneOff
        : false;
  const hasSupportedPath = canSync || canOneOff;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-foreground">Create audio from a link</h1>
        <p className="mt-1 text-muted-foreground">Paste a link once. We&apos;ll handle the rest.</p>
      </div>

      {step === "input" && (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Input
                placeholder="https://example.com/post"
                value={inputUrl}
                onChange={(event) => setInputUrl(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleContinue();
                  }
                }}
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">
                Works with blogs, newsletters (Substack, Medium, WordPress), and most websites.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleContinue} disabled={loadingDiscovery || !inputUrl.trim()}>
                {loadingDiscovery ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push("/app")}>
                Cancel
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {step === "review" && discovery && (
        <>
          {/* Preview Card */}
          <Card className="overflow-hidden">
            {preview?.imageUrl && (
              <div className="aspect-[2/1] w-full bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <CardContent className="space-y-4 pt-5">
              {/* Title */}
              <h2 className="font-serif text-xl font-medium leading-snug text-foreground">
                {preview?.title || discovery.displayName || "Untitled"}
              </h2>

              {/* Excerpt */}
              {preview?.excerpt && (
                <p className="line-clamp-3 text-sm text-muted-foreground">{preview.excerpt}</p>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {preview?.author && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {preview.author}
                  </span>
                )}
                {preview?.siteName && (
                  <span className="flex items-center gap-1.5">
                    {discovery.faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={discovery.faviconUrl}
                        alt=""
                        className="h-3.5 w-3.5 rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    {preview.siteName}
                  </span>
                )}
                {preview?.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(preview.publishedAt)}
                  </span>
                )}
                {preview?.readTimeMinutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {preview.readTimeMinutes} min read
                  </span>
                )}
              </div>

              {/* Platform badge */}
              {discovery.platformHint && (
                <Badge variant="outline" className="capitalize">
                  {discovery.platformHint}
                </Badge>
              )}

              {/* Links */}
              <div className="flex flex-wrap items-center gap-4 border-t pt-4 text-xs">
                {discovery.canonicalUrl && (
                  <a
                    href={discovery.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open original
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStep("input");
                    setDiscovery(null);
                    setSelectedMode(null);
                  }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Not the right post?
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Feed info if available */}
          {hasFeed && (
            <Card>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <Rss className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">Auto-sync feed found</div>
                    <p className="text-xs text-muted-foreground">
                      We can keep this updated automatically.
                    </p>
                    {discovery.recommendedFeedUrl && (
                      <code className="block break-all text-[11px] text-muted-foreground">
                        {discovery.recommendedFeedUrl}
                      </code>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="self-start text-[10px]">
                  Recommended
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Mode selection */}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                if (canSync) setSelectedMode("sync");
              }}
              disabled={!canSync}
              className={`group rounded-xl border p-5 text-left transition-colors ${
                selectedMode === "sync"
                  ? "border-foreground/30 bg-muted/50"
                  : "border-border hover:border-foreground/20 hover:bg-muted/50"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-medium text-foreground">Keep it synced (recommended)</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Auto-sync feed. New posts become episodes automatically.
                </p>
                {!canSync && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    We need a feed to keep this updated.
                  </p>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (canOneOff) setSelectedMode("one-off");
              }}
              disabled={!canOneOff}
              className={`group rounded-xl border p-5 text-left transition-colors ${
                selectedMode === "one-off"
                  ? "border-foreground/30 bg-muted/50"
                  : "border-border hover:border-foreground/20 hover:bg-muted/50"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-medium text-foreground">Just this one</div>
                <p className="mt-1 text-sm text-muted-foreground">Use this website link for a single episode.</p>
                {!canOneOff && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Paste a specific post link to continue.
                  </p>
                )}
              </div>
            </button>
          </div>

          {/* No valid action available */}
          {!hasSupportedPath && (
            <Alert>
              <AlertTitle>We couldn&apos;t find an auto-sync feed for this link.</AlertTitle>
              <AlertDescription>
                Paste a specific article link (for example, https://example.com/post) or paste your homepage and
                we&apos;ll try again.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep("format")} disabled={!canProceed}>
              Continue to format
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("input");
                setDiscovery(null);
                setSelectedMode(null);
              }}
            >
              ← Back
            </Button>
          </div>

          {/* Show details (editable) */}
          <Card>
            <CardContent className="pt-5">
              <Accordion type="single" collapsible>
                <AccordionItem value="details" className="border-none">
                  <AccordionTrigger className="py-0 text-sm">Show details</AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Show name
                        </label>
                        <Input
                          placeholder="Show name"
                          value={siteName}
                          onChange={(event) => setSiteName(event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          Domain (optional)
                        </label>
                        <Input
                          placeholder="example.com"
                          value={siteDomain}
                          onChange={(event) => setSiteDomain(event.target.value)}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Advanced (manual feed) */}
          <Card>
            <CardContent className="pt-5">
              <Accordion type="single" collapsible>
                <AccordionItem value="advanced" className="border-none">
                  <AccordionTrigger className="py-0 text-sm">
                    RSS (advanced)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {discovery.feeds?.length ? (
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">Detected feeds</div>
                        <div className="space-y-2">
                          {discovery.feeds.map((feed) => (
                            <div key={feed.url} className="flex items-start gap-2">
                              <Badge variant="outline" className="mt-0.5 text-[10px] uppercase">
                                {feed.type}
                              </Badge>
                              <div className="flex-1 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <code className="break-all">{feed.url}</code>
                                  {discovery.recommendedFeedUrl === feed.url && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Recommended
                                    </Badge>
                                  )}
                                </div>
                                {feed.latestItemTitle && (
                                  <div className="line-clamp-1 text-[11px] text-muted-foreground">
                                    Latest: {feed.latestItemTitle}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No feed detected. Paste one below.
                      </div>
                    )}
                    <div className="space-y-2">
                      <Input
                        placeholder="https://example.com/feed"
                        value={manualFeedUrl}
                        onChange={(event) => setManualFeedUrl(event.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleManualFeed}>
                          Use this feed
                        </Button>
                        {manualFeedError && (
                          <span className="text-xs text-red-600">{manualFeedError}</span>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}

      {step === "format" && discovery && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {formatOptions.map((option) => (
                <button
                  key={option.id}
                  className={`rounded-xl border p-4 text-left transition ${
                    format === option.id
                      ? "border-foreground/30 bg-muted/50"
                      : "border-border hover:border-foreground/20 hover:bg-muted/30"
                  }`}
                  onClick={() => setFormat(option.id)}
                  type="button"
                >
                  <div className="text-sm font-medium text-foreground">{option.title}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("review")}>
                ← Back
              </Button>
              <Button onClick={() => handleGenerate()} disabled={!canProceed}>
                {selectedMode === "sync" ? "Create & auto-sync" : "Create this episode"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{progress}</div>
            {episodeStatus && (
              <Badge variant={episodeStatus === "FAILED" ? "destructive" : "secondary"}>
                {episodeStatus === "CANCELLED" ? "Canceled" : episodeStatus}
              </Badge>
            )}
            {error && <div className="text-sm text-red-600">{error}</div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
