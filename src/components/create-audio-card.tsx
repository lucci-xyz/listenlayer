"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Mic, Users, Zap, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/time";
import { getDomainFromUrl } from "@/lib/url";
import { OutOfCreditsDialog } from "@/components/out-of-credits-dialog";
import type { PlanKey } from "@/lib/stripe";

const formats = [
  {
    value: "narration",
    label: "Solo narration",
    description: "Clean single-voice read",
    icon: Mic,
  },
  {
    value: "two-host",
    label: "Two hosts",
    description: "Conversational discussion",
    icon: Users,
  },
  {
    value: "tldr",
    label: "TL;DR summary",
    description: "Concise 2 minute overview",
    icon: Zap,
  },
] as const;

type Format = (typeof formats)[number]["value"];
type FlowType = "article" | "feed";
type ModalStep =
  | "feed-select"
  | "feed-preview"
  | "article-preview"
  | "format"
  | "confirm"
  | "auth-required";
type ArticlePreview = {
  kind: "article";
  title: string;
  excerpt: string;
  wordCount: number;
  estimatedMinutes: number;
  siteName: string;
  url: string;
};
type FeedItem = {
  id: string;
  title: string;
  url: string;
  pubDate: string | null;
  description: string | null;
  contentText?: string | null;
};
type FeedPreview = {
  kind: "feed";
  feed: {
    title: string;
    feedUrl: string;
    siteUrl: string | null;
    itemCount: number;
  };
  items: FeedItem[];
};
type PreviewData = ArticlePreview | FeedPreview;
type AuthPayload = {
  type: "basic" | "bearer";
  username?: string;
  password?: string;
  token?: string;
};

const modalStepLabels: Record<ModalStep, string> = {
  "feed-select": "Choose episode",
  "feed-preview": "Preview episode",
  "article-preview": "Preview article",
  format: "Choose format",
  confirm: "Review & generate",
  "auth-required": "Credentials required",
};

const modalStepMeta: Record<ModalStep, { title: string; description: string }> = {
  "feed-select": {
    title: "Choose an episode",
    description: "Pick an episode from the feed to generate audio.",
  },
  "feed-preview": {
    title: "Preview episode",
    description: "Review the episode summary before choosing a format.",
  },
  "article-preview": {
    title: "Preview article",
    description: "Review the article summary before choosing a format.",
  },
  format: {
    title: "Choose a format",
    description: "Select how the episode should sound.",
  },
  confirm: {
    title: "Review and generate",
    description: "Confirm the details before generating audio.",
  },
  "auth-required": {
    title: "Credentials required",
    description: "This source needs authentication before we can continue.",
  },
};

export function CreateAudioCard({
  currentPlan = "free",
  creditsResetAt = null,
}: {
  currentPlan?: PlanKey;
  creditsResetAt?: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("narration");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [flowType, setFlowType] = useState<FlowType | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>("article-preview");
  const [articlePreview, setArticlePreview] = useState<ArticlePreview | null>(null);
  const [feedPreview, setFeedPreview] = useState<FeedPreview | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [selectedItemPreview, setSelectedItemPreview] = useState<ArticlePreview | null>(null);
  const [selectedItemError, setSelectedItemError] = useState<string | null>(null);
  const [selectedItemLoading, setSelectedItemLoading] = useState(false);
  const [addFeed, setAddFeed] = useState(false);
  const [authMode, setAuthMode] = useState<"basic" | "bearer">("basic");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [authHint, setAuthHint] = useState<"basic" | "bearer" | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authContext, setAuthContext] = useState<
    "preview" | "item-preview" | "generate" | null
  >(null);
  const [authSource, setAuthSource] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);

  const isAuthStep = modalStep === "auth-required";
  const modalSteps = useMemo(() => {
    if (isAuthStep) {
      return ["auth-required"] as ModalStep[];
    }
    if (flowType === "feed") {
      return ["feed-select", "feed-preview", "format", "confirm"] as ModalStep[];
    }
    return ["article-preview", "format", "confirm"] as ModalStep[];
  }, [flowType, isAuthStep]);

  const modalStepIndex = useMemo(() => {
    if (!flowType && !isAuthStep) return 1;
    const index = modalSteps.indexOf(modalStep);
    return index === -1 ? 1 : index + 1;
  }, [flowType, modalSteps, modalStep, isAuthStep]);

  const modalStepTotal = flowType || isAuthStep ? modalSteps.length : 1;

  const selectedFormat = useMemo(
    () => formats.find((option) => option.value === format),
    [format]
  );

  const readyToGenerate =
    flowType === "feed" ? Boolean(selectedItem) : Boolean(articlePreview);
  const authReady =
    authMode === "basic" ? Boolean(authUsername && authPassword) : Boolean(authToken);
  const authPayload = useMemo<AuthPayload | undefined>(() => {
    if (authMode === "basic" && authUsername && authPassword) {
      return { type: "basic", username: authUsername, password: authPassword };
    }
    if (authMode === "bearer" && authToken) {
      return { type: "bearer", token: authToken };
    }
    return undefined;
  }, [authMode, authUsername, authPassword, authToken]);

  const resetFlow = () => {
    setModalOpen(false);
    setFlowType(null);
    setModalStep("article-preview");
    setArticlePreview(null);
    setFeedPreview(null);
    setSelectedItem(null);
    setSelectedItemPreview(null);
    setSelectedItemError(null);
    setSelectedItemLoading(false);
    setAddFeed(false);
    setFormat("narration");
    setPreviewError(null);
    setGenerating(false);
    setAuthMode("basic");
    setAuthUsername("");
    setAuthPassword("");
    setAuthToken("");
    setAuthHint(null);
    setAuthMessage(null);
    setAuthContext(null);
    setAuthSource(null);
    setAuthSubmitting(false);
    setCreditsDialogOpen(false);
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      resetFlow();
      return;
    }
    setModalOpen(true);
  };

  const requiresAuthNotice = "Source requires authentication. Add credentials to continue.";
  const rejectedAuthNotice = "Credentials were rejected or are insufficient.";

  const openAuthPrompt = (
    context: "preview" | "item-preview" | "generate",
    message: string,
    hint: "basic" | "bearer" | null,
    source: string
  ) => {
    setAuthContext(context);
    setAuthMessage(message);
    setAuthHint(hint);
    setAuthSource(source);
    if (hint) {
      setAuthMode(hint);
    }
    setModalStep("auth-required");
    setModalOpen(true);
  };

  const handleAuthContinue = async () => {
    if (!authReady || !authContext) return;
    setAuthSubmitting(true);
    try {
      if (authContext === "preview") {
        await handlePreview();
      } else if (authContext === "item-preview") {
        await loadSelectedItemPreview();
      } else {
        await handleGenerate();
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handlePreview = async () => {
    if (!url.trim()) return;
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }

      const payload: { url: string; auth?: AuthPayload } = { url: normalizedUrl };
      if (authPayload) {
        payload.auth = authPayload;
      }

      const res = await fetch("/api/episodes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      type PreviewResponse = PreviewData & {
        error?: string;
        code?: string;
        authHint?: "basic" | "bearer" | null;
      };
      let data: PreviewResponse | null = null;
      try {
        data = raw ? (JSON.parse(raw) as PreviewResponse) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        if (data?.code === "FORBIDDEN") {
          const message = data?.error || requiresAuthNotice;
          const hint = data?.authHint ?? null;
          openAuthPrompt("preview", message, hint, normalizedUrl);
          return;
        }
        throw new Error(
          data?.error ||
            "Preview failed. The server returned an invalid response (check deployment logs)."
        );
      }
      if (!data) {
        throw new Error(
          "Preview failed. The server returned an invalid response (check deployment logs)."
        );
      }

      setFormat("narration");
      setAddFeed(false);
      setSelectedItem(null);
      setSelectedItemPreview(null);
      setSelectedItemError(null);
      setSelectedItemLoading(false);

      if (data.kind === "feed") {
        setFlowType("feed");
        setFeedPreview(data);
        setArticlePreview(null);
        setModalStep("feed-select");
      } else {
        setFlowType("article");
        setArticlePreview(data);
        setFeedPreview(null);
        setModalStep("article-preview");
      }

      setAuthHint(null);
      setAuthMessage(null);
      setAuthContext(null);
      setAuthSource(null);

      setModalOpen(true);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Unable to preview link");
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewUnavailableNotice = "Full preview unavailable. Using feed summary.";

  const handleSelectItem = (item: FeedItem) => {
    setSelectedItem(item);
    setSelectedItemPreview(null);
    setSelectedItemError(null);
  };

  const loadSelectedItemPreview = async () => {
    if (!selectedItem) return;
    let openedAuthPrompt = false;
    setSelectedItemError(null);
    setSelectedItemLoading(true);
    setSelectedItemPreview(null);

    try {
      const payload: { url: string; auth?: AuthPayload } = { url: selectedItem.url };
      if (authPayload) {
        payload.auth = authPayload;
      }
      const res = await fetch("/api/episodes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      type PreviewResponse = PreviewData & {
        error?: string;
        code?: string;
        authHint?: "basic" | "bearer" | null;
      };
      let data: PreviewResponse | null = null;
      try {
        data = raw ? (JSON.parse(raw) as PreviewResponse) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        if (data?.code === "FORBIDDEN") {
          const message = data?.error || requiresAuthNotice;
          const hint = data?.authHint ?? null;
          openAuthPrompt("item-preview", message, hint, selectedItem.url);
          openedAuthPrompt = true;
          return;
        }
        throw new Error(
          data?.error ||
            "Preview failed. The server returned an invalid response (check deployment logs)."
        );
      }
      if (!data) {
        throw new Error(
          "Preview failed. The server returned an invalid response (check deployment logs)."
        );
      }

      if (data?.kind === "feed") {
        setSelectedItemError(previewUnavailableNotice);
      } else {
        setSelectedItemPreview({ ...data, kind: "article" });
      }

      setAuthHint(null);
      setAuthMessage(null);
      setAuthContext(null);
      setAuthSource(null);
    } catch (err) {
      setSelectedItemError(
        err instanceof Error ? err.message : previewUnavailableNotice
      );
    } finally {
      setSelectedItemLoading(false);
      if (!openedAuthPrompt) {
        setModalStep("feed-preview");
      }
    }
  };

  const handleGenerate = async () => {
    const sourceUrl = flowType === "feed" ? selectedItem?.url : articlePreview?.url;
    if (!sourceUrl) return;
    setGenerating(true);

    try {
      let feedId: string | undefined;
      if (flowType === "feed" && addFeed && feedPreview) {
        const feedRes = await fetch("/api/feeds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedUrl: feedPreview.feed.feedUrl,
            name: feedPreview.feed.title,
            siteUrl: feedPreview.feed.siteUrl ?? undefined,
          }),
        });
        const feedData = await feedRes.json();
        if (!feedRes.ok) {
          throw new Error(feedData.error || "Failed to add feed");
        }
        feedId = feedData.feed.id;
      }

      const title =
        flowType === "feed"
          ? selectedItemPreview?.title ?? selectedItem?.title
          : articlePreview?.title;

      const payload: {
        url: string;
        format: Format;
        title?: string;
        feedId?: string;
        sourceText?: string;
        auth?: AuthPayload;
      } = {
        url: sourceUrl,
        format,
        title,
        feedId,
        sourceText: flowType === "feed" ? selectedItem?.contentText ?? undefined : undefined,
      };
      if (authPayload) {
        payload.auth = authPayload;
      }

      const res = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        error?: string;
        code?: string;
        authHint?: "basic" | "bearer" | null;
        episodeId?: string;
      };
      if (!res.ok) {
        if (res.status === 402) {
          setCreditsDialogOpen(true);
          return;
        }
        if (data.code === "FORBIDDEN") {
          const message = data.error || requiresAuthNotice;
          const hint = data.authHint ?? null;
          openAuthPrompt("generate", message, hint, sourceUrl);
          return;
        }
        throw new Error(data.error || "Failed to generate");
      }

      toast.success("Started generating");
      setUrl("");
      resetFlow();

      if (data.episodeId) {
        router.push(`/app/episodes/${data.episodeId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const renderArticlePreview = (previewData: ArticlePreview, sourceLabel?: string) => (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Preview
      </div>
      <div className="mt-2 text-lg font-semibold text-foreground">{previewData.title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{sourceLabel ?? previewData.siteName}</span>
        <span>•</span>
        <span>{previewData.estimatedMinutes} min listen</span>
        <span>•</span>
        <span>{previewData.wordCount.toLocaleString()} words</span>
      </div>
      {previewData.excerpt ? (
        <p className="mt-3 text-sm text-muted-foreground">{previewData.excerpt}</p>
      ) : null}
    </div>
  );

  const summaryTitle =
    flowType === "feed" ? selectedItem?.title : articlePreview?.title;
  const summarySource =
    flowType === "feed"
      ? feedPreview?.feed.title ??
        (selectedItem ? getDomainFromUrl(selectedItem.url) : undefined)
      : articlePreview?.siteName;
  const summaryPreview = flowType === "feed" ? selectedItemPreview : articlePreview;
  const formatBackStep: ModalStep =
    flowType === "feed" ? "feed-preview" : "article-preview";
  const authSourceLabel = authSource ? getDomainFromUrl(authSource) : null;

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>Create episode</span>
          <span className="text-foreground/70">Paste link</span>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="article-url">
              Article or RSS feed URL
            </label>
            <Input
              id="article-url"
              placeholder="https://example.com/article or https://example.com/feed.xml"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handlePreview();
                }
              }}
              disabled={previewLoading}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              We will detect articles or RSS feeds and guide you through the next step.
            </p>
          </div>

          {previewError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {previewError}
            </div>
          ) : null}

          <div className="flex items-center justify-end">
            <Button onClick={handlePreview} disabled={!url.trim() || previewLoading}>
              {previewLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {flowType || modalStep === "auth-required" ? (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between pr-10 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>
                    Step {modalStepIndex} of {modalStepTotal}
                  </span>
                  <span className="text-foreground/70">{modalStepLabels[modalStep]}</span>
                </div>
                <DialogTitle className="mt-3 font-display text-2xl text-foreground">
                  {modalStepMeta[modalStep].title}
                </DialogTitle>
                <DialogDescription className="text-base">
                  {modalStepMeta[modalStep].description}
                </DialogDescription>
              </DialogHeader>

              {modalStep === "auth-required" ? (
                <>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Access required
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">
                      {authMessage || requiresAuthNotice}
                    </div>
                    {authSourceLabel ? (
                      <div className="mt-1 text-xs text-muted-foreground">{authSourceLabel}</div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="text-sm font-medium text-foreground">Provide credentials</div>
                    <div className="text-xs text-muted-foreground">
                      {authHint === "basic"
                        ? "This source appears to require Basic authentication."
                        : authHint === "bearer"
                        ? "This source appears to require a Bearer token."
                        : "Choose the credential type required by the source."}
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={authMode === "basic" ? "default" : "outline"}
                          onClick={() => setAuthMode("basic")}
                        >
                          Basic
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={authMode === "bearer" ? "default" : "outline"}
                          onClick={() => setAuthMode("bearer")}
                        >
                          Bearer token
                        </Button>
                      </div>
                      {authMode === "basic" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            placeholder="Username"
                            value={authUsername}
                            onChange={(e) => setAuthUsername(e.target.value)}
                          />
                          <Input
                            type="password"
                            placeholder="Password"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                          />
                        </div>
                      ) : (
                        <Input
                          type="password"
                          placeholder="Bearer token"
                          value={authToken}
                          onChange={(e) => setAuthToken(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={resetFlow}>
                      Cancel
                    </Button>
                    <Button onClick={handleAuthContinue} disabled={!authReady || authSubmitting}>
                      {authSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking access
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </DialogFooter>
                </>
              ) : null}

              {modalStep === "feed-select" && feedPreview ? (
                <>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Rss className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Feed detected
                        </div>
                        <div className="mt-2 text-lg font-semibold text-foreground">
                          {feedPreview.feed.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {getDomainFromUrl(feedPreview.feed.siteUrl ?? feedPreview.feed.feedUrl)}
                          </span>
                          <span>•</span>
                          <span>{feedPreview.feed.itemCount} episodes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Choose an episode
                    </div>
                    <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                      {feedPreview.items.map((item) => {
                        const isSelected = selectedItem?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectItem(item)}
                            className={cn(
                              "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                              isSelected
                                ? "border-primary/30 bg-primary/5 shadow-soft"
                                : "border-border/60 hover:border-primary/30 hover:bg-muted/40"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground line-clamp-2">
                                  {item.title}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {item.pubDate ? (
                                    <span>{formatRelativeTime(item.pubDate)}</span>
                                  ) : null}
                                  {item.description ? <span>•</span> : null}
                                  {item.description ? (
                                    <span className="line-clamp-1">{item.description}</span>
                                  ) : null}
                                </div>
                              </div>
                              {isSelected ? (
                                <span className="text-xs font-semibold text-primary">Selected</span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={resetFlow}>
                      Edit link
                    </Button>
                    <Button
                      onClick={loadSelectedItemPreview}
                      disabled={!selectedItem || selectedItemLoading}
                    >
                      {selectedItemLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading preview
                        </>
                      ) : (
                        "Preview episode"
                      )}
                    </Button>
                  </DialogFooter>
                </>
              ) : null}

              {modalStep === "feed-preview" && selectedItem ? (
                <>
                  {selectedItemError ? (
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      {selectedItemError}
                    </div>
                  ) : null}

                  {selectedItemPreview
                    ? renderArticlePreview(
                        selectedItemPreview,
                        feedPreview?.feed.title ?? getDomainFromUrl(selectedItem.url)
                      )
                    : (
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Preview
                        </div>
                        <div className="mt-2 text-lg font-semibold text-foreground">
                          {selectedItem.title}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {feedPreview?.feed.title ?? getDomainFromUrl(selectedItem.url)}
                          </span>
                          {selectedItem.pubDate ? <span>•</span> : null}
                          {selectedItem.pubDate ? (
                            <span>{formatRelativeTime(selectedItem.pubDate)}</span>
                          ) : null}
                        </div>
                        {selectedItem.description ? (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {selectedItem.description}
                          </p>
                        ) : null}
                      </div>
                    )}

                  <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={() => setModalStep("feed-select")}>
                      Back
                    </Button>
                    <Button onClick={() => setModalStep("format")}>Choose format</Button>
                  </DialogFooter>
                </>
              ) : null}

              {modalStep === "article-preview" && articlePreview ? (
                <>
                  {renderArticlePreview(articlePreview)}
                  <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={resetFlow}>
                      Edit link
                    </Button>
                    <Button onClick={() => setModalStep("format")}>Choose format</Button>
                  </DialogFooter>
                </>
              ) : null}

              {modalStep === "format" ? (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    {formats.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormat(option.value)}
                        className={cn(
                          "flex flex-col gap-3 rounded-xl border border-border/60 bg-background px-4 py-4 text-left transition-colors hover:border-primary/30 hover:bg-muted/40",
                          format === option.value && "border-primary/30 bg-primary/5 shadow-soft"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg border border-border/60",
                            format === option.value
                              ? "bg-primary text-primary-foreground border-primary/30"
                              : "bg-muted/40 text-muted-foreground"
                          )}
                        >
                          <option.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={() => setModalStep(formatBackStep)}>
                      Back
                    </Button>
                    <Button onClick={() => setModalStep("confirm")}>Review</Button>
                  </DialogFooter>
                </>
              ) : null}

              {modalStep === "confirm" ? (
                <>
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Summary
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      {summaryTitle ?? "Untitled"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {summarySource ? <span>{summarySource}</span> : null}
                      {summaryPreview?.estimatedMinutes ? <span>•</span> : null}
                      {summaryPreview?.estimatedMinutes ? (
                        <span>{summaryPreview.estimatedMinutes} min listen</span>
                      ) : null}
                      {summaryPreview?.wordCount ? <span>•</span> : null}
                      {summaryPreview?.wordCount ? (
                        <span>{summaryPreview.wordCount.toLocaleString()} words</span>
                      ) : null}
                    </div>
                    {summaryPreview?.excerpt ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {summaryPreview.excerpt}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="text-sm font-medium text-foreground">Format</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedFormat?.label}
                      {selectedFormat?.description ? ` — ${selectedFormat.description}` : ""}
                    </div>
                  </div>

                  {flowType === "feed" && feedPreview ? (
                    <div className="rounded-xl border border-border/60 bg-background p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            Add this feed to your dashboard
                          </div>
                          <div className="text-xs text-muted-foreground">{feedPreview.feed.title}</div>
                        </div>
                        <Switch checked={addFeed} onCheckedChange={setAddFeed} />
                      </div>
                    </div>
                  ) : null}

                  <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={() => setModalStep("format")}>
                      Back
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={!readyToGenerate || generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate audio
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <OutOfCreditsDialog
        open={creditsDialogOpen}
        onOpenChange={setCreditsDialogOpen}
        currentPlan={currentPlan}
        resetAt={creditsResetAt}
      />
    </>
  );
}
