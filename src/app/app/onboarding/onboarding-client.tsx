"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    title: "TL;DR recap",
    description: "Punchy, fast-paced summary.",
  },
] as const;

type FormatId = (typeof formatOptions)[number]["id"];

type DiscoveryResult = {
  detectedType: "RSS" | "URL";
  sourceUrl: string;
  pageUrl: string;
  siteName: string;
  domain: string;
  iconUrl?: string | null;
  rssUrl?: string | null;
};

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inputUrl, setInputUrl] = useState("");
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [sourceType, setSourceType] = useState<"RSS" | "URL">("URL");
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState<FormatId>("narration");
  const [progress, setProgress] = useState("Preparing...");
  const [episodeStatus, setEpisodeStatus] = useState<
    "QUEUED" | "RUNNING" | "PUBLISHED" | "FAILED" | null
  >(null);

  const canContinue = useMemo(() => {
    if (!discovery) return false;
    return siteName.trim().length > 1 && sourceUrl.length > 3;
  }, [discovery, siteName, sourceUrl]);

  const handleDiscovery = async () => {
    setError(null);
    setLoadingDiscovery(true);
    setDiscovery(null);
    try {
      const res = await fetch("/api/sources/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to detect source");
      }
      const data = (await res.json()) as DiscoveryResult;
      setDiscovery(data);
      setSiteName(data.siteName || "");
      setSiteDomain(data.domain || "");
      setSourceType(data.detectedType);
      setSourceUrl(data.sourceUrl || "");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setLoadingDiscovery(false);
    }
  };

  const handleGenerate = async () => {
    if (!discovery) return;
    setError(null);
    setStep(3);
    setProgress("Creating your site...");

    try {
      const siteRes = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: siteName, domain: siteDomain }),
      });
      if (!siteRes.ok) throw new Error("Failed to create site");
      const siteData = await siteRes.json();
      const siteId = siteData.site.id as string;

      setProgress("Adding your source...");
      const sourceRes = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, type: sourceType, url: sourceUrl }),
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
        const status = data.episode?.status as
          | "QUEUED"
          | "RUNNING"
          | "PUBLISHED"
          | "FAILED";
        setEpisodeStatus(status);
        if (status === "PUBLISHED") {
          router.push(`/app/sites/${siteId}/embeds`);
          return;
        }
        if (status === "FAILED") {
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Add a new site</h1>
        <p className="text-sm text-zinc-500">Paste a URL once. We handle the rest.</p>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 · Paste your website or RSS feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="example.com or https://example.com/feed"
              value={inputUrl}
              onChange={(event) => setInputUrl(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleDiscovery} disabled={!inputUrl || loadingDiscovery}>
                {loadingDiscovery ? "Detecting..." : "Detect source"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/app")}>
                Cancel
              </Button>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            {discovery ? (
              <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                    {discovery.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={discovery.iconUrl} alt="" className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-semibold">
                        {discovery.siteName?.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{discovery.siteName}</div>
                    <div className="text-xs text-zinc-500">{discovery.domain}</div>
                  </div>
                  <Badge className="ml-auto" variant="secondary">
                    {discovery.detectedType === "RSS" ? "RSS detected" : "Website detected"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === "RSS"}
                      onChange={() => {
                        if (discovery.rssUrl) {
                          setSourceType("RSS");
                          setSourceUrl(discovery.rssUrl);
                        }
                      }}
                      disabled={!discovery.rssUrl}
                    />
                    Use RSS feed
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === "URL"}
                      onChange={() => {
                        setSourceType("URL");
                        setSourceUrl(discovery.pageUrl);
                      }}
                    />
                    Use website URL
                  </label>
                  {discovery.rssUrl ? (
                    <span className="text-xs text-zinc-400">{discovery.rssUrl}</span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>Site details</span>
                  <button
                    className="text-xs font-semibold text-zinc-800"
                    onClick={() => setEditing((prev) => !prev)}
                    type="button"
                  >
                    {editing ? "Done" : "Edit"}
                  </button>
                </div>

                {editing ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Site name"
                      value={siteName}
                      onChange={(event) => setSiteName(event.target.value)}
                    />
                    <Input
                      placeholder="Domain"
                      value={siteDomain}
                      onChange={(event) => setSiteDomain(event.target.value)}
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setStep(2)} disabled={!canContinue}>
                    Continue to format
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 · Choose your format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {formatOptions.map((option) => (
                <button
                  key={option.id}
                  className={`rounded-xl border p-4 text-left transition ${
                    format === option.id
                      ? "border-zinc-900 bg-white shadow-sm"
                      : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                  }`}
                  onClick={() => setFormat(option.id)}
                  type="button"
                >
                  <div className="text-sm font-semibold text-zinc-900">{option.title}</div>
                  <p className="mt-1 text-xs text-zinc-500">{option.description}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleGenerate}>Generate episode</Button>
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
            <div className="text-sm text-zinc-600">{progress}</div>
            {episodeStatus ? (
              <Badge variant={episodeStatus === "FAILED" ? "destructive" : "secondary"}>
                {episodeStatus}
              </Badge>
            ) : null}
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
