"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

const formatOptions = [
  { id: "narration", title: "Narration", description: "Single host, clear storytelling." },
  { id: "two-host", title: "Two-host conversation", description: "Dialogue format with two voices." },
  { id: "tldr", title: "Quick recap", description: "Short, fast summary." },
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

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "review" | "details" | "progress">("input");
  const [inputUrl, setInputUrl] = useState("");
  const [detectedUrl, setDetectedUrl] = useState("");
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<"sync" | "one-off" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualFeedUrl, setManualFeedUrl] = useState("");
  const [manualFeedError, setManualFeedError] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatId>("narration");
  const [progress, setProgress] = useState("Preparing…");
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
    setImageUrl(data.articlePreview?.imageUrl || data.faviconUrl || "");
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
      const normalized = { ...data, feeds: data.feeds ?? [] };
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
      if (result) setStep("review");
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

  const handleGenerate = async () => {
    if (!discovery) return;
    const primaryFeed = discovery.feeds?.[0];
    const chosenMode = selectedMode ?? resolveDefaultMode(discovery);
    if (!chosenMode) {
      setError("Choose how you want to proceed first.");
      return;
    }
    setError(null);
    setStep("progress");
    setProgress(chosenMode === "sync" ? "Creating your workspace…" : "Preparing your audio…");

    const sourceType = chosenMode === "sync" ? "RSS" : "URL";
    let sourceUrl: string | undefined;

    if (chosenMode === "sync") {
      sourceUrl = discovery.recommendedFeedUrl || primaryFeed?.url;
    } else {
      if (discovery.kind === "article" && discovery.canonicalUrl) {
        sourceUrl = discovery.canonicalUrl;
      } else if (primaryFeed?.sampleItems?.[0]?.url) {
        sourceUrl = primaryFeed.sampleItems[0].url;
      } else if (discovery.canonicalUrl) {
        sourceUrl = discovery.canonicalUrl;
      }
    }

    if (!sourceUrl) {
      setError("Paste a specific post URL or a feed to continue.");
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

      setProgress("Adding your source…");
      const sourceRes = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          type: sourceType,
          url: sourceUrl,
          displayName: discovery.displayName,
          faviconUrl: imageUrl || discovery.faviconUrl || undefined,
        }),
      });
      if (!sourceRes.ok) throw new Error("Failed to add source");
      const sourceData = await sourceRes.json();
      const sourceId = sourceData.source.id as string;

      setProgress("Queueing your first episode…");
      const episodeRes = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, sourceId, format }),
      });
      if (!episodeRes.ok) throw new Error("Failed to queue episode");
      const episodeData = await episodeRes.json();
      const episodeId = episodeData.episodeId as string;
      if (!episodeId) throw new Error("Failed to queue episode");

      setProgress("Generating audio. This can take a minute…");
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
  const hasFeed = discovery?.kind === "feed" && Boolean(discovery.recommendedFeedUrl || primaryFeed?.url);
  const canSync = Boolean(hasFeed);
  const canOneOff = discovery?.kind === "article" || Boolean(primaryFeed?.sampleItems?.[0]?.url);
  const canProceed = selectedMode === "sync" ? canSync : selectedMode === "one-off" ? canOneOff : false;
  const hasSupportedPath = canSync || canOneOff;

  // Guidance copy based on detection
  const guidanceCopy = () => {
    if (hasFeed) return "Auto-sync this feed (default) or just this link.";
    if (discovery?.kind === "article") return null;
    if (discovery && !hasSupportedPath) return "Paste a specific post link to continue.";
    return null;
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium text-foreground">Create audio from a link</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paste a link once. We&apos;ll handle the rest.</p>
      </div>

      {/* Step 1: Input */}
      {step === "input" && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Input
              placeholder="https://example.com/post"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
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
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => router.push("/app")}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={loadingDiscovery || !inputUrl.trim()}>
                {loadingDiscovery ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review / Confirm */}
      {step === "review" && discovery && (
        <Card>
          <CardContent className="space-y-5 pt-6">
            {/* Preview */}
            <div className="space-y-2">
              <h2 className="font-medium text-foreground">
                {preview?.title || discovery.displayName || "Untitled"}
              </h2>
              {preview?.excerpt && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{preview.excerpt}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {discovery.platformHint && (
                  <span className="rounded bg-muted px-1.5 py-0.5 capitalize">{discovery.platformHint}</span>
                )}
                {discovery.canonicalUrl && (
                  <a
                    href={discovery.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open original
                  </a>
                )}
              </div>
            </div>

            {/* Guidance */}
            {guidanceCopy() && (
              <p className="text-sm text-muted-foreground">{guidanceCopy()}</p>
            )}

            {/* Mode selection (only if we have options) */}
            {hasSupportedPath && (
              <div className="grid gap-2 sm:grid-cols-2">
                {canSync && (
                  <button
                    type="button"
                    onClick={() => setSelectedMode("sync")}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedMode === "sync"
                        ? "border-foreground/30 bg-muted/50"
                        : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <div className="text-sm font-medium">Auto-sync feed</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      New posts become episodes automatically.
                    </p>
                  </button>
                )}
                {canOneOff && (
                  <button
                    type="button"
                    onClick={() => setSelectedMode("one-off")}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedMode === "one-off"
                        ? "border-foreground/30 bg-muted/50"
                        : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <div className="text-sm font-medium">Single episode</div>
                    <p className="mt-1 text-xs text-muted-foreground">One-time generate.</p>
                  </button>
                )}
              </div>
            )}

            {/* Format selection */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Format</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {formatOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      format === opt.id
                        ? "border-foreground/30 bg-muted/50"
                        : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <div className="text-sm font-medium">{opt.title}</div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("input");
                  setDiscovery(null);
                  setSelectedMode(null);
                }}
              >
                ← Back
              </Button>
              <Button onClick={() => setStep("details")} disabled={!canProceed}>
                Next
              </Button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Advanced (RSS) — collapsed by default */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Advanced
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Paste RSS URL manually</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://example.com/feed"
                        value={manualFeedUrl}
                        onChange={(e) => setManualFeedUrl(e.target.value)}
                      />
                      <Button variant="outline" size="sm" onClick={handleManualFeed}>
                        Use
                      </Button>
                    </div>
                    {manualFeedError && <p className="text-xs text-red-600">{manualFeedError}</p>}
                  </div>
                  {discovery.feeds?.length > 0 && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">Detected feeds</div>
                      {discovery.feeds.map((feed) => (
                        <code key={feed.url} className="block break-all">{feed.url}</code>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Progress */}
      {step === "details" && discovery && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Name your show</div>
              <Input
                placeholder="Show name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Cover image URL (optional)</div>
              <Input
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              {imageUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <img
                    src={imageUrl}
                    alt="Cover preview"
                    className="h-12 w-12 rounded-md object-cover"
                    onError={() => setImageUrl("")}
                  />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
              {!imageUrl && discovery.faviconUrl && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Using detected image from the site. You can replace it above.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => setStep("review")}>← Back</Button>
              <Button onClick={handleGenerate}>Generate</Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Progress */}
      {step === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">{progress}</div>
            {episodeStatus && episodeStatus !== "QUEUED" && episodeStatus !== "RUNNING" && (
              <div className="text-xs text-muted-foreground">
                Status: {episodeStatus === "CANCELLED" ? "Canceled" : episodeStatus}
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
