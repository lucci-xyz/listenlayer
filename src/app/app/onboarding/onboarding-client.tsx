"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type FeedInfo = {
  url: string;
  title?: string;
  type: "rss" | "atom";
  itemCount?: number;
  latestItemTitle?: string;
  latestItemUrl?: string;
};

type DiscoveryResult = {
  kind: "feed" | "article" | "website" | "unknown";
  platformHint?: string | null;
  feeds: FeedInfo[];
  recommendedFeedUrl?: string | null;
  canonicalUrl: string;
  origin: string;
  displayName: string;
  faviconUrl?: string | null;
};

type Mode = "sync" | "one-off";

type EpisodeStatus = "QUEUED" | "RUNNING" | "PUBLISHED" | "FAILED" | "CANCELLED";

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inputUrl, setInputUrl] = useState("");
  const [detectedUrl, setDetectedUrl] = useState("");
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [mode, setMode] = useState<Mode>("one-off");
  const [manualFeedUrl, setManualFeedUrl] = useState("");
  const [manualFeedError, setManualFeedError] = useState<string | null>(null);
  const [format, setFormat] = useState<FormatId>("narration");
  const [progress, setProgress] = useState("Preparing...");
  const [episodeStatus, setEpisodeStatus] = useState<EpisodeStatus | null>(null);

  const feedUrl = useMemo(() => {
    if (!discovery) return "";
    return discovery.recommendedFeedUrl || discovery.feeds?.[0]?.url || "";
  }, [discovery]);

  const latestFeedItemTitle = discovery?.feeds?.[0]?.latestItemTitle || "";
  const latestFeedItemUrl = discovery?.feeds?.[0]?.latestItemUrl || "";

  const oneOffUrl = useMemo(() => {
    if (!discovery) return "";
    if (discovery.kind === "article") return discovery.canonicalUrl;
    if (discovery.kind === "feed") return latestFeedItemUrl || "";
    return "";
  }, [discovery, latestFeedItemUrl]);

  const canContinue = useMemo(() => {
    if (!discovery) return false;
    if (!siteName.trim()) return false;
    if (mode === "sync") return Boolean(feedUrl);
    return Boolean(oneOffUrl);
  }, [discovery, feedUrl, mode, oneOffUrl, siteName]);

  const applyDiscovery = (data: DiscoveryResult, usedUrl: string) => {
    setDiscovery(data);
    setDetectedUrl(usedUrl);
    setNotice(null);
    setError(null);
    setManualFeedError(null);
    setMode(data.kind === "feed" ? "sync" : "one-off");
    setSiteName(data.displayName || "New show");
    try {
      const hostname = new URL(data.origin).hostname;
      setSiteDomain(hostname);
    } catch {
      setSiteDomain("");
    }
    if (data.kind === "website" || data.kind === "unknown") {
      setNotice(
        "We couldn't find an auto-sync feed for this link. Paste a specific post URL, or try your homepage again."
      );
    }
  };

  const handleDiscovery = async (urlOverride?: string) => {
    const urlToCheck = (urlOverride ?? inputUrl).trim();
    if (!urlToCheck) return;
    setError(null);
    setNotice(null);
    setManualFeedError(null);
    setLoadingDiscovery(true);
    setDiscovery(null);
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
      applyDiscovery(data, urlToCheck);
      return data;
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
      await handleDiscovery();
      return;
    }
    if (!canContinue) return;
    setStep(2);
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
    setError(null);
    setStep(3);
    setProgress("Creating your show...");

    const sourceType = mode === "sync" ? "RSS" : "URL";
    const sourceUrl = mode === "sync" ? feedUrl : oneOffUrl;

    if (!sourceUrl) {
      setError("We couldn't use that link yet. Paste a specific post URL or a feed.");
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
          router.push(`/app/embed?siteId=${siteId}`);
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

  const kindLabel = discovery?.kind
    ? discovery.kind === "feed"
      ? "Feed found"
      : discovery.kind === "article"
        ? "Post detected"
        : discovery.kind === "website"
          ? "Website detected"
          : "Unknown"
    : null;

  const showChoice = discovery && (discovery.kind === "feed" || discovery.kind === "article");
  const canSync = Boolean(feedUrl);
  const canOneOff = Boolean(oneOffUrl);
  const inputChanged = inputUrl.trim() !== detectedUrl;
  const continueDisabled =
    loadingDiscovery ||
    !inputUrl.trim() ||
    (!inputChanged && Boolean(discovery) && !canContinue);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Start a new show</h1>
        <p className="text-[13px] text-muted-foreground">Paste a link and we&apos;ll build the first episode.</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 · Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="https://example.com/post"
                value={inputUrl}
                onChange={(event) => setInputUrl(event.target.value)}
                onBlur={() => {
                  if (inputUrl.trim() && inputUrl.trim() !== detectedUrl) {
                    void handleDiscovery();
                  }
                }}
              />
              <p className="text-[12px] text-muted-foreground">
                Paste a post link or homepage. We&apos;ll detect if it can stay in sync.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleContinue} disabled={continueDisabled}>
                {loadingDiscovery ? "Checking..." : "Continue"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/app")}>Cancel</Button>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {discovery ? (
              <div className="space-y-4 rounded-lg border border-border/70 bg-background p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {discovery.faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={discovery.faviconUrl} alt="" className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-semibold">
                        {discovery.displayName?.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">
                      {discovery.displayName}
                    </div>
                    <div className="text-[12px] text-muted-foreground">{discovery.origin}</div>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2">
                    {discovery.platformHint ? (
                      <Badge variant="outline">{discovery.platformHint} detected</Badge>
                    ) : null}
                    {kindLabel ? <Badge variant="secondary">{kindLabel}</Badge> : null}
                  </div>
                </div>

                {discovery.kind === "feed" ? (
                  <p className="text-[13px] text-muted-foreground">
                    We can keep this updated automatically, or just generate the latest post now.
                  </p>
                ) : null}

                {discovery.kind === "article" ? (
                  <p className="text-[13px] text-muted-foreground">
                    We&apos;ll generate audio for this post.
                  </p>
                ) : null}

                {notice ? (
                  <Alert className="border-amber-200/70 bg-amber-50">
                  <AlertTitle>We couldn&apos;t auto-sync this link.</AlertTitle>
                  <AlertDescription>
                    {notice}
                    <div className="mt-2 text-[12px] text-muted-foreground">
                      Example: https://example.com/blog/my-post
                    </div>
                  </AlertDescription>
                </Alert>
                ) : null}

                {showChoice ? (
                  discovery.kind === "feed" ? (
                    <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                      <TabsList>
                        <TabsTrigger value="sync" disabled={!canSync}>
                          Keep in sync
                        </TabsTrigger>
                        <TabsTrigger value="one-off" disabled={!canOneOff}>
                          One-time episode
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="sync">
                        <div className="rounded-lg border border-border/70 bg-background p-3 text-[13px] text-muted-foreground">
                          We&apos;ll watch the feed and you can generate new episodes anytime.
                          {feedUrl ? (
                            <div className="mt-2 text-[12px] text-muted-foreground">
                              Using feed: {feedUrl}
                            </div>
                          ) : null}
                        </div>
                      </TabsContent>
                      <TabsContent value="one-off">
                        <div className="rounded-lg border border-border/70 bg-background p-3 text-[13px] text-muted-foreground">
                          We&apos;ll use the latest post right now.
                          {latestFeedItemTitle ? (
                            <div className="mt-2 text-[12px] text-muted-foreground">
                              Latest: {latestFeedItemTitle}
                            </div>
                          ) : null}
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="rounded-lg border border-border/70 bg-background p-3 text-[13px] text-muted-foreground">
                      Just this one post
                    </div>
                  )
                ) : null}

                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <span>Show details</span>
                  <button
                    className="text-[12px] font-medium text-foreground"
                    onClick={() => setEditing((prev) => !prev)}
                    type="button"
                  >
                    {editing ? "Done" : "Edit"}
                  </button>
                </div>

                {editing ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Show name"
                      value={siteName}
                      onChange={(event) => setSiteName(event.target.value)}
                    />
                    <Input
                      placeholder="Domain (optional)"
                      value={siteDomain}
                      onChange={(event) => setSiteDomain(event.target.value)}
                    />
                  </div>
                ) : null}

                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced">
                    <AccordionTrigger>Advanced</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-[13px]">
                        <div>
                          <div className="text-[12px] font-medium text-muted-foreground">
                            Feed (advanced)
                          </div>
                          {discovery.feeds?.length ? (
                            <ul className="mt-2 space-y-1 text-[12px] text-muted-foreground">
                              {discovery.feeds.map((feed) => (
                                <li key={feed.url} className="break-all">
                                  {feed.url}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="mt-2 text-[12px] text-muted-foreground">
                              No feed detected yet. Paste one below.
                            </div>
                          )}
                        </div>
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
                            {manualFeedError ? (
                              <span className="text-[12px] text-rose-600">{manualFeedError}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {(!canContinue && !inputChanged) ? (
                  <div className="text-[12px] text-muted-foreground">
                    Add a specific post link to continue.
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 · Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {formatOptions.map((option) => (
                <button
                  key={option.id}
                  className={`rounded-lg border p-4 text-left transition ${
                    format === option.id
                      ? "border-foreground/50 bg-background"
                      : "border-border/70 bg-muted/60 hover:border-muted-foreground/40"
                  }`}
                  onClick={() => setFormat(option.id)}
                  type="button"
                >
                  <div className="text-[13px] font-semibold text-foreground">{option.title}</div>
                  <p className="mt-1 text-[12px] text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleGenerate}>Create episode</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3 · Generating</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-[13px] text-muted-foreground">{progress}</div>
            {episodeStatus ? (
              <Badge variant={episodeStatus === "FAILED" ? "destructive" : "secondary"}>
                {episodeStatus === "CANCELLED" ? "Canceled" : episodeStatus}
              </Badge>
            ) : null}
            {error ? <div className="text-[13px] text-red-600">{error}</div> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
