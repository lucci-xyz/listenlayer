"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Rss,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatRelativeTime } from "@/lib/time";
import { getDomainFromUrl } from "@/lib/url";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FormatOption = "solo" | "two-hosts" | "tldr";

type Feed = {
  id: string;
  name: string;
  feedUrl: string;
  siteUrl: string | null;
  faviconUrl: string | null;
  lastFetchedAt: string | null;
  lastError: string | null;
};

type Episode = {
  id: string;
  title: string;
  status: string;
  sourceUrl: string;
  publicId: string;
  createdAt: string;
};

type FeedItem = {
  title: string;
  url: string;
  pubDate: string | null;
  description: string | null;
  status: string | null;
};

export function FeedDetailClient({
  feed,
  episodes,
}: {
  feed: Feed;
  episodes: Episode[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Format selection dialog state
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatOption>("solo");

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/feeds/${feed.id}/items`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  // Open format selection dialog
  const openFormatDialog = (item: FeedItem) => {
    setSelectedItem(item);
    setSelectedFormat("solo");
    setFormatDialogOpen(true);
  };

  // Actually generate after format is selected
  const handleGenerate = async () => {
    if (!selectedItem) return;
    
    setFormatDialogOpen(false);
    setGenerating(selectedItem.url);
    
    try {
      const res = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: selectedItem.url,
          feedId: feed.id,
          title: selectedItem.title,
          format: selectedFormat,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      toast.success("Generation started!");
      router.refresh();

      if (data.episodeId) {
        router.push(`/app/episodes/${data.episodeId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(null);
      setSelectedItem(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/feeds/${feed.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Feed deleted");
      router.push("/app/feeds");
    } catch {
      toast.error("Failed to delete feed");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const statusBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PUBLISHED: "default",
      QUEUED: "secondary",
      RUNNING: "secondary",
      FAILED: "destructive",
    };
    const labels: Record<string, string> = {
      PUBLISHED: "Generated",
      QUEUED: "Queued",
      RUNNING: "Generating",
      FAILED: "Failed",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/app/feeds"
            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to feeds
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Rss className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl tracking-tight">{feed.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{getDomainFromUrl(feed.feedUrl)}</span>
                {feed.siteUrl && (
                  <a
                    href={feed.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open(feed.feedUrl, "_blank")}
              >
                View feed URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete feed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error message */}
      {feed.lastError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {feed.lastError}
        </div>
      )}

      {/* Articles from feed */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Latest articles</h2>
          {feed.lastFetchedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {formatRelativeTime(feed.lastFetchedAt)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 py-12 text-center">
            <p className="text-sm text-muted-foreground">No articles found in feed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.url}
                className="group rounded-xl border border-border/70 bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </a>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {item.pubDate && <span>{formatRelativeTime(item.pubDate)}</span>}
                      {statusBadge(item.status)}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={item.status ? "outline" : "default"}
                    onClick={() => openFormatDialog(item)}
                    disabled={generating === item.url || item.status === "QUEUED" || item.status === "RUNNING"}
                    className="shrink-0"
                  >
                    {generating === item.url ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : item.status === "PUBLISHED" ? (
                      "Regenerate"
                    ) : item.status === "QUEUED" || item.status === "RUNNING" ? (
                      "Generating..."
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Create audio
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generated episodes from this feed */}
      {episodes.length > 0 && (
        <div>
          <h2 className="mb-4 font-medium">Generated episodes</h2>
          <div className="divide-y divide-border/50 rounded-xl border border-border/70 bg-card">
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                href={`/app/episodes/${ep.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{ep.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(ep.createdAt)}
                  </div>
                </div>
                {statusBadge(ep.status)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Format selection dialog */}
      <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose audio format</DialogTitle>
            <DialogDescription>
              {selectedItem?.title && (
                <span className="line-clamp-1">{selectedItem.title}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            <button
              type="button"
              onClick={() => setSelectedFormat("solo")}
              className={cn(
                "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors",
                selectedFormat === "solo"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Mic className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">Solo narration</div>
                <div className="text-sm text-muted-foreground">
                  Clean, professional reading of the article
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat("two-hosts")}
              className={cn(
                "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors",
                selectedFormat === "two-hosts"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">Two hosts</div>
                <div className="text-sm text-muted-foreground">
                  Conversational discussion between two voices
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat("tldr")}
              className={cn(
                "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors",
                selectedFormat === "tldr"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">TL;DR</div>
                <div className="text-sm text-muted-foreground">
                  Quick 1-2 minute summary of key points
                </div>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormatDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate}>
              <Sparkles className="mr-2 h-4 w-4" />
              Create audio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete feed subscription?</DialogTitle>
            <DialogDescription>
              This will remove the feed subscription. Episodes generated from this feed will be kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
