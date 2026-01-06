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


// Represents a content source connected to a publication.
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
  kind: "feed" | "article" | "website" | "unknown";
  platformHint?: string | null;
  feeds: {
    url: string;
    title?: string;
    type: "rss" | "atom";
    itemCount?: number;
    latestItemTitle?: string;
    latestItemUrl?: string;
  }[];
  recommendedFeedUrl?: string | null;
  canonicalUrl: string;
  origin: string;
  displayName: string;
  faviconUrl?: string | null;
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
      if (data.kind === "feed") {
        const feedUrl = data.recommendedFeedUrl || data.feeds?.[0]?.url || "";
        setSourceType("RSS");
        setSourceUrl(feedUrl);
      } else if (data.kind === "article") {
        setSourceType("URL");
        setSourceUrl(data.canonicalUrl);
      } else {
        setSourceType("URL");
        setSourceUrl("");
        setError("No auto-sync feed found. Use a Single URL instead.");
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
              displayName: discovery?.displayName,
              faviconUrl: discovery?.faviconUrl || undefined,
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
          <h2 className="text-lg font-semibold text-foreground">Sources</h2>
          <p className="text-[13px] text-muted-foreground">
            Connect a feed or link to generate episodes.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Add source</Button>
      </div>

      {sources.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-[13px] text-muted-foreground">
            No sources yet. Add a website or feed to start.
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
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={favicon} alt="" className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[13px] font-semibold text-foreground">{displayName}</div>
                          <Badge variant="secondary">{typeLabel}</Badge>
                        </div>
                        <div className="text-[12px] text-muted-foreground">{domain}</div>
                        {source.type === "RSS" && source.latestItemTitle ? (
                          <div className="text-[12px] text-muted-foreground">
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

                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="rounded-md border border-border/70 px-2 py-1">
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
                      <span className="rounded-md border border-border/70 px-2 py-1">
                        Status: {source.lastFetchStatus}
                      </span>
                    ) : null}
                  </div>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="details">
                      <AccordionTrigger>Details</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/60 px-3 py-2 text-[12px]">
                            <span className="truncate text-muted-foreground">{source.url}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(source.url)}
                            >
                              Copy URL
                            </Button>
                          </div>
                          {source.lastError ? (
                            <div className="rounded-lg border border-rose-200/70 bg-rose-50/70 px-3 py-2 text-[12px] text-rose-600">
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
                          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-[12px]">
                            <div>
                              <div className="font-semibold text-foreground">Auto publish</div>
                              <div className="text-muted-foreground">Coming soon</div>
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

          <div className="mt-4 flex flex-wrap gap-1 rounded-md bg-muted/60 p-1">
            {([
              { key: "website", label: "Website (recommended)" },
              { key: "rss", label: "Feed (RSS)" },
              { key: "url", label: "Single URL" },
            ] as const).map((option) => (
              <Button
                key={option.key}
                size="sm"
                variant="ghost"
                className={
                  mode === option.key
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
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
              <p className="text-[12px] text-muted-foreground">
                Paste a specific article URL. Homepages without articles will be rejected.
              </p>
            ) : null}

            {mode === "website" ? (
              <Button onClick={handleDiscover} disabled={!inputUrl || loading}>
                {loading ? "Checking..." : "Check link"}
              </Button>
            ) : null}

            {discovery ? (
              <div className="rounded-lg border border-border/70 bg-muted/60 p-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{discovery.displayName}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {getDomainFromUrl(discovery.origin)}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {discovery.kind === "feed"
                      ? "Feed found"
                      : discovery.kind === "article"
                        ? "Post detected"
                        : "Website detected"}
                  </Badge>
                </div>
                {discovery.kind === "website" || discovery.kind === "unknown" ? (
                  <div className="mt-2 rounded-md border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-700">
                    No RSS feed found. Switch to Single URL to generate from a specific article.
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMode("url");
                          setInputUrl(discovery.canonicalUrl);
                          setDiscovery(null);
                          setError(null);
                        }}
                      >
                        Use single URL
                      </Button>
                    </div>
                  </div>
                ) : null}
                {discovery.kind === "feed" ? (
                  <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={sourceType === "RSS"}
                        onChange={() => {
                          const feedUrl = discovery.recommendedFeedUrl || discovery.feeds?.[0]?.url || "";
                          if (feedUrl) {
                            setSourceType("RSS");
                            setSourceUrl(feedUrl);
                          }
                        }}
                      />
                      RSS feed
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={sourceType === "URL"}
                        onChange={() => {
                          const latestUrl = discovery.feeds?.[0]?.latestItemUrl || discovery.canonicalUrl;
                          setSourceType("URL");
                          setSourceUrl(latestUrl);
                        }}
                      />
                      Latest post URL
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <div className="text-[13px] text-red-600">{error}</div> : null}
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
