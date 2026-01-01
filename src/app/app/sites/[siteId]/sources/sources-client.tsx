"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { getDomainFromUrl } from "@/lib/url";
import { formatDateTime, formatRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GenerateButton } from "@/components/generate-button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


// Represents a content source connected to a workspace.
type Source = {
  id: string;
  type: "RSS" | "URL";
  url: string;
  displayName?: string | null;
  faviconUrl?: string | null;
  latestItemTitle?: string | null;
  latestItemUrl?: string | null;
  lastFetchStatus?: string | null;
  lastError?: string | null;
  lastFetchedAt: string | null;
};

type DiscoveryResult = {
  detectedType: "RSS" | "URL";
  sourceUrl: string;
  pageUrl: string;
  siteName: string;
  domain: string;
  iconUrl?: string | null;
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
  const [mode, setMode] = useState<"website" | "rss" | "url">("website");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [sourceType, setSourceType] = useState<"RSS" | "URL">("RSS");
  const [sourceUrl, setSourceUrl] = useState("");
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editName, setEditName] = useState("");

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
      if (data.rssUrl) {
        setSourceUrl(data.sourceUrl);
      } else {
        setSourceUrl("");
        setError("No RSS feed found. Use a Single URL instead.");
      }
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
        mode === "website"
          ? {
              siteId,
              type: sourceType,
              url: sourceUrl,
              displayName: discovery?.siteName,
              faviconUrl: discovery?.iconUrl || undefined,
            }
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
      setOpen(false);
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  const handleRemove = async (sourceId: string) => {
    await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
    router.refresh();
  };

  const handleTestFetch = async (sourceId: string) => {
    await fetch("/api/sources/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    router.refresh();
  };

  const openEditModal = (source: Source) => {
    setEditingSource(source);
    setEditUrl(source.url);
    setEditName(source.displayName || "");
  };

  const handleEditSave = async () => {
    if (!editingSource) return;
    await fetch(`/api/sources/${editingSource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: editUrl, displayName: editName || null }),
    });
    setEditingSource(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Sources</h2>
          <p className="text-sm text-zinc-500">Connect feeds and URLs to generate new episodes.</p>
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
          {sources.map((source) => {
            const domain = getDomainFromUrl(source.url);
            const displayName = source.displayName || domain;
            const favicon = source.faviconUrl || `https://${domain}/favicon.ico`;
            let typeLabel = source.type === "RSS" ? "RSS" : "Website";
            if (source.type === "URL") {
              try {
                const parsed = new URL(source.url);
                if (parsed.pathname && parsed.pathname !== "/") {
                  typeLabel = "Single URL";
                }
              } catch {
                typeLabel = "Website";
              }
            }
            return (
              <Card key={source.id} className="overflow-hidden">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={favicon} alt="" className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-zinc-900">{displayName}</div>
                          <Badge variant="secondary">
                            {typeLabel}
                          </Badge>
                        </div>
                        <div className="text-xs text-zinc-500">{domain}</div>
                        {source.type === "RSS" && source.latestItemTitle ? (
                          <div className="text-xs text-zinc-500">
                            Latest item: {source.latestItemTitle}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <GenerateButton siteId={siteId} sourceId={source.id} count={1} label="Generate" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(source)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(source.url)}>Copy URL</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTestFetch(source.id)}>Test fetch</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRemove(source.id)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="rounded-full border border-zinc-200 px-2 py-1">
                            {source.lastFetchedAt
                              ? `Checked ${formatRelativeTime(source.lastFetchedAt)}`
                              : "Never checked"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {source.lastFetchedAt ? formatDateTime(source.lastFetchedAt) : "Not fetched yet"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {source.lastFetchStatus ? (
                      <span className="rounded-full border border-zinc-200 px-2 py-1">
                        Status: {source.lastFetchStatus}
                      </span>
                    ) : null}
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="details">
                      <AccordionTrigger>Details</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                            <span className="truncate text-zinc-600">{source.url}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(source.url)}
                            >
                              Copy URL
                            </Button>
                          </div>
                          {source.lastError ? (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                              {source.lastError}
                            </div>
                          ) : null}
                          {source.type === "RSS" ? (
                            <div className="flex flex-wrap gap-2">
                              <GenerateButton siteId={siteId} sourceId={source.id} count={1} label="Last 1" />
                              <GenerateButton siteId={siteId} sourceId={source.id} count={3} label="Last 3" />
                              <GenerateButton siteId={siteId} sourceId={source.id} count={5} label="Last 5" />
                              <GenerateButton siteId={siteId} sourceId={source.id} count={10} label="Last 10" />
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-xs">
                            <div>
                              <div className="font-semibold text-zinc-700">Auto publish</div>
                              <div className="text-zinc-400">Coming soon</div>
                            </div>
                            <Switch checked={false} disabled />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a source</DialogTitle>
            <DialogDescription>Choose how you want to connect your content.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-wrap gap-2">
            {([
              { key: "website", label: "Website (recommended)" },
              { key: "rss", label: "RSS feed" },
              { key: "url", label: "Single URL" },
            ] as const).map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant={mode === option.key ? "default" : "outline"}
                onClick={() => {
                  setMode(option.key);
                  setDiscovery(null);
                  setInputUrl("");
                  setSourceUrl("");
                }}
              >
                {option.label}
              </Button>
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
            {mode === "url" ? (
              <p className="text-xs text-zinc-500">
                Paste a specific article URL. Homepages without articles will be rejected.
              </p>
            ) : null}

            {mode === "website" ? (
              <Button onClick={handleDiscover} disabled={!inputUrl || loading}>
                {loading ? "Scanning..." : "Detect"}
              </Button>
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
                {!discovery.rssUrl ? (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    No RSS feed found. Switch to Single URL to generate from a specific article.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMode("url");
                          setInputUrl(discovery.pageUrl);
                          setDiscovery(null);
                          setError(null);
                        }}
                      >
                        Use single URL
                      </Button>
                    </div>
                  </div>
                ) : null}
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
                      disabled={!discovery.rssUrl}
                    />
                    Website URL
                  </label>
                </div>
              </div>
            ) : null}

            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </div>

          <DialogFooter className="mt-4">
            <Button
              onClick={handleAddSource}
              disabled={
                loading ||
                (mode === "website"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSource} onOpenChange={(openState) => !openState && setEditingSource(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit source</DialogTitle>
            <DialogDescription>Update the URL or display name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Display name" />
            <Input value={editUrl} onChange={(event) => setEditUrl(event.target.value)} placeholder="https://" />
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleEditSave}>Save changes</Button>
            <Button variant="outline" onClick={() => setEditingSource(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
