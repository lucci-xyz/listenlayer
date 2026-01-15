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
import { FeedIcon } from "@/components/feed-icon";

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
    const colors: Record<string, string> = {
      PUBLISHED: "bg-success/10 text-success",
      QUEUED: "bg-warning/15 text-warning-foreground",
      RUNNING: "bg-warning/15 text-warning-foreground",
      FAILED: "bg-destructive/10 text-destructive",
    };
    const labels: Record<string, string> = {
      PUBLISHED: "Generated",
      QUEUED: "Queued",
      RUNNING: "Generating",
      FAILED: "Failed",
    };
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide", colors[status] || "bg-muted/60 text-muted-foreground")}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/app/feeds"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to feeds
        </Link>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-foreground">{feed.name}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{getDomainFromUrl(feed.feedUrl)}</span>
              {feed.siteUrl && (
                <>
                  <span className="text-border">•</span>
                  <a
                    href={feed.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Visit site <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-10 px-4"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => window.open(feed.feedUrl, "_blank")}>
                  View feed URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete feed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        {/* Latest Articles */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display text-foreground">Latest Articles</h2>
            {feed.lastFetchedAt && (
              <span className="text-xs font-medium text-muted-foreground bg-muted/60 border border-border/60 px-2.5 py-1 rounded-full">
                Updated {formatRelativeTime(feed.lastFetchedAt)}
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                No articles found in feed.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {items.map((item) => (
                  <div key={item.url} className="group p-6 hover:bg-muted/40 transition-colors">
                    <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold text-foreground hover:text-primary transition-colors leading-tight block"
                        >
                          {item.title}
                        </a>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {item.pubDate && <span className="font-medium">{formatRelativeTime(item.pubDate)}</span>}
                          {item.status && (
                            <>
                              <span className="text-border">•</span>
                              {statusBadge(item.status)}
                            </>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end pt-2">
                        <Button
                          size="sm"
                          variant={item.status ? "outline" : "default"}
                          onClick={() => openFormatDialog(item)}
                          disabled={generating === item.url || item.status === "QUEUED" || item.status === "RUNNING"}
                          className={cn(
                            "rounded-lg h-9 px-5 text-xs font-medium transition-colors",
                            !item.status && "shadow-sm"
                          )}
                        >
                          {generating === item.url ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Creating...
                            </>
                          ) : item.status === "PUBLISHED" ? (
                            "Regenerate"
                          ) : item.status === "QUEUED" || item.status === "RUNNING" ? (
                            "Generating..."
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-3.5 w-3.5" />
                              Create Audio
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Generated Episodes */}
        <div className="space-y-6">
          <h2 className="text-xl font-display text-foreground">Generated Episodes</h2>
          
          {episodes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center bg-muted/30">
              <p className="text-sm text-muted-foreground">
                No episodes generated yet. Pick an article to start.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
              <div className="divide-y divide-border/40">
                {episodes.map((ep) => (
                  <Link
                    key={ep.id}
                    href={`/app/episodes/${ep.id}`}
                    className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                        {ep.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(ep.createdAt)}</span>
                        {statusBadge(ep.status)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Choose Format</DialogTitle>
            <DialogDescription className="text-base">
              Select how you want this article to be narrated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            {[
              { id: "solo", label: "Solo Narration", desc: "Professional single-voice reading", icon: Mic },
              { id: "two-hosts", label: "Two Hosts", desc: "Conversational discussion style", icon: Users },
              { id: "tldr", label: "TL;DR Summary", desc: "Concise 2-minute overview", icon: Zap },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedFormat(option.id as FormatOption)}
                className={cn(
                  "flex items-center gap-4 rounded-xl border border-border/60 p-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/40",
                  selectedFormat === option.id
                    ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/60"
                )}
              >
                <div className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                  selectedFormat === option.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"
                )}>
                  <option.icon className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div>
                  <div className={cn("font-semibold", selectedFormat === option.id ? "text-primary" : "text-foreground")}>
                    {option.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {option.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <DialogFooter className="sm:justify-between gap-4">
            <Button variant="ghost" onClick={() => setFormatDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleGenerate} className="rounded-lg px-8">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Audio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete feed subscription?</DialogTitle>
            <DialogDescription>
              This will remove <strong>{feed.name}</strong> from your dashboard. Generated episodes will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg"
            >
              {deleting ? "Deleting..." : "Delete Feed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
