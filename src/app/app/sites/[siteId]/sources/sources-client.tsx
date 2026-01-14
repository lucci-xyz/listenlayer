"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { getDomainFromUrl } from "@/lib/url";
import { formatDateTime, formatRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GenerateButton } from "@/components/generate-button";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

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
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);

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
    toast.success("Copied to clipboard");
  };

  const handleRemove = async (sourceId: string) => {
    await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
    router.refresh();
  };

  const handleTestFetch = async (sourceId: string) => {
    setTestingSourceId(sourceId);
    try {
      const res = await fetch("/api/sources/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "Test fetch failed");
      }
      toast.success("Source fetched successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test fetch failed");
    } finally {
      setTestingSourceId(null);
      router.refresh();
    }
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
          <p className="text-sm text-muted-foreground">
            Connect a feed or link to generate episodes.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Add source</Button>
      </div>

      {sources.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No sources yet. Add a website or feed to start.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const domain = getDomainFromUrl(source.url);
            const displayName = source.displayName || domain;
            const isExpanded = expandedSource === source.id;
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
              <Card key={source.id}>
                <CardContent className="p-4">
                  {/* Main row */}
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{displayName}</span>
                        <Badge variant="secondary" className="text-[10px]">{typeLabel}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{domain}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] text-muted-foreground">
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
                      <button
                        type="button"
                        onClick={() => setExpandedSource(isExpanded ? null : source.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(source)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(source.url)}>Copy URL</DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={testingSourceId === source.id}
                            onClick={() => handleTestFetch(source.id)}
                          >
                            {testingSourceId === source.id ? "Testing..." : "Test fetch"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleRemove(source.id)} className="text-destructive">
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {/* URL display */}
                      <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                        <code className="flex-1 truncate text-xs text-muted-foreground">{source.url}</code>
                        <Button size="sm" variant="ghost" onClick={() => handleCopy(source.url)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Error message */}
                      {source.lastError && (
                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          {source.lastError}
                        </div>
                      )}

                      {/* Batch generate for RSS */}
                      {source.type === "RSS" && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-muted-foreground">Generate:</span>
                          <GenerateButton siteId={siteId} sourceId={source.id} count={1} label="Last 1" size="sm" variant="outline" />
                          <GenerateButton siteId={siteId} sourceId={source.id} count={3} label="Last 3" size="sm" variant="outline" />
                          <GenerateButton siteId={siteId} sourceId={source.id} count={5} label="Last 5" size="sm" variant="outline" />
                        </div>
                      )}

                      {/* Latest item */}
                      {source.latestItemTitle && (
                        <div className="text-xs text-muted-foreground">
                          Latest: <span className="text-foreground">{source.latestItemTitle}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Source Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a source</DialogTitle>
            <DialogDescription>Choose how you want to connect your content.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-1 rounded-lg bg-muted p-1">
            {([
              { key: "website", label: "Website" },
              { key: "rss", label: "RSS Feed" },
              { key: "url", label: "Single URL" },
            ] as const).map((option) => (
              <button
                key={option.key}
                type="button"
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === option.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setMode(option.key);
                  setDiscovery(null);
                  setInputUrl("");
                  setSourceUrl("");
                }}
              >
                {option.label}
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
            {mode === "url" && (
              <p className="text-xs text-muted-foreground">
                Paste a specific article URL.
              </p>
            )}

            {mode === "website" && (
              <Button onClick={handleDiscover} disabled={!inputUrl || loading}>
                {loading ? "Checking..." : "Check link"}
              </Button>
            )}

            {discovery && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{discovery.displayName}</div>
                    <div className="text-xs text-muted-foreground">
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
                  <div className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                    No RSS feed found. Switch to Single URL to generate from a specific article.
                  </div>
                ) : null}
                {discovery.kind === "feed" && (
                  <div className="mt-2 flex gap-3 text-xs">
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
                )}
              </div>
            )}

            {error && <div className="text-sm text-destructive">{error}</div>}
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

      {/* Edit Source Dialog */}
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
