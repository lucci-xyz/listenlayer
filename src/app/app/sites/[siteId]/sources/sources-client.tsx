"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GenerateButton } from "@/components/generate-button";

type Source = {
  id: string;
  type: "RSS" | "URL";
  url: string;
  lastFetchedAt: string | null;
};

type DiscoveryResult = {
  detectedType: "RSS" | "URL";
  sourceUrl: string;
  pageUrl: string;
  siteName: string;
  domain: string;
  rssUrl?: string | null;
};

export default function SourcesClient({
  siteId,
  sources,
}: {
  siteId: string;
  sources: Source[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"auto" | "rss" | "url">("auto");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [sourceType, setSourceType] = useState<"RSS" | "URL">("RSS");
  const [sourceUrl, setSourceUrl] = useState("");

  const resetModal = () => {
    setInputUrl("");
    setError(null);
    setDiscovery(null);
    setSourceUrl("");
    setSourceType("RSS");
  };

  const handleDiscover = async () => {
    setError(null);
    setLoading(true);
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
      setSourceType(data.detectedType);
      setSourceUrl(data.sourceUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload =
        mode === "auto"
          ? { siteId, type: sourceType, url: sourceUrl }
          : { siteId, type: mode === "rss" ? "RSS" : "URL", url: inputUrl };

      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to add source");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Sources</h2>
          <p className="text-sm text-zinc-500">Manage feeds and URLs to generate new episodes.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add source</Button>
      </div>

      {sources.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            No sources yet. Add a website or RSS feed to start.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{source.type}</Badge>
                    <span className="text-sm font-semibold text-zinc-900">{source.url}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {source.lastFetchedAt
                      ? `Last fetched ${new Date(source.lastFetchedAt).toLocaleString()}`
                      : "Never fetched"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <GenerateButton siteId={siteId} sourceId={source.id} count={1} label="Generate latest" />
                  {source.type === "RSS" ? (
                    <>
                      <GenerateButton siteId={siteId} sourceId={source.id} count={3} label="Last 3" />
                      <GenerateButton siteId={siteId} sourceId={source.id} count={5} label="Last 5" />
                      <GenerateButton siteId={siteId} sourceId={source.id} count={10} label="Last 10" />
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Add a source</div>
                <p className="text-sm text-zinc-500">Choose how you want to bring content in.</p>
              </div>
              <button
                className="text-sm text-zinc-500"
                onClick={() => {
                  setOpen(false);
                  resetModal();
                }}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              {(["auto", "rss", "url"] as const).map((option) => (
                <button
                  key={option}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    mode === option
                      ? "border-zinc-900 text-zinc-900"
                      : "border-zinc-200 text-zinc-500"
                  }`}
                  onClick={() => {
                    setMode(option);
                    setDiscovery(null);
                    setInputUrl("");
                    setSourceUrl("");
                  }}
                  type="button"
                >
                  {option === "auto" ? "Auto-import" : option === "rss" ? "RSS feed" : "Single URL"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <Input
                placeholder={
                  mode === "rss"
                    ? "https://example.com/rss.xml"
                    : mode === "url"
                      ? "https://example.com/blog/post"
                      : "https://example.com"
                }
                value={inputUrl}
                onChange={(event) => setInputUrl(event.target.value)}
              />

              {mode === "auto" ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleDiscover} disabled={!inputUrl || loading}>
                    {loading ? "Scanning..." : "Detect"}
                  </Button>
                </div>
              ) : null}

              {discovery ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-zinc-900">{discovery.siteName}</div>
                      <div className="text-xs text-zinc-500">{discovery.domain}</div>
                    </div>
                    <Badge variant="secondary">{discovery.detectedType}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={sourceType === "RSS"}
                        onChange={() => {
                          if (discovery.rssUrl) {
                            setSourceType("RSS");
                            setSourceUrl(discovery.rssUrl);
                          }
                        }}
                        disabled={!discovery.rssUrl}
                      />
                      RSS feed
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={sourceType === "URL"}
                        onChange={() => {
                          setSourceType("URL");
                          setSourceUrl(discovery.pageUrl);
                        }}
                      />
                      Website URL
                    </label>
                  </div>
                </div>
              ) : null}

              {error ? <div className="text-sm text-red-600">{error}</div> : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleAddSource}
                  disabled={
                    loading ||
                    (mode === "auto"
                      ? !sourceUrl
                      : !inputUrl || inputUrl.trim().length < 6)
                  }
                >
                  Add source
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetModal();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
