"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Mic, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
type Step = "input" | "preview" | "format";
type PreviewData = {
  title: string;
  excerpt: string;
  wordCount: number;
  estimatedMinutes: number;
  siteName: string;
  url: string;
};

const stepLabels: Record<Step, string> = {
  input: "Paste link",
  preview: "Review article",
  format: "Choose format",
};

export function CreateAudioCard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("narration");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const stepIndex = useMemo(() => {
    return (["input", "preview", "format"] as Step[]).indexOf(step) + 1;
  }, [step]);

  const handlePreview = async () => {
    if (!url.trim()) return;
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }

      const res = await fetch("/api/episodes/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to preview article");
      }

      setPreview(data);
      setStep("preview");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Unable to preview article");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!preview?.url) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: preview.url, format, title: preview.title }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      toast.success("Started generating");
      setUrl("");
      setPreview(null);
      setStep("input");
      
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

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span>Step {stepIndex} of 3</span>
        <span className="text-foreground/70">{stepLabels[step]}</span>
      </div>

      {step === "input" && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="article-url">
              Article URL
            </label>
            <Input
              id="article-url"
              placeholder="https://example.com/article"
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
              We will extract the article title and content for review.
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
      )}

      {step === "preview" && preview && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Found
            </div>
            <div className="mt-2 text-lg font-semibold text-foreground">{preview.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{preview.siteName}</span>
              <span>•</span>
              <span>{preview.estimatedMinutes} min listen</span>
              <span>•</span>
              <span>{preview.wordCount.toLocaleString()} words</span>
            </div>
            {preview.excerpt ? (
              <p className="mt-3 text-sm text-muted-foreground">{preview.excerpt}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep("input")}>
              Edit link
            </Button>
            <Button onClick={() => setStep("format")}>Choose format</Button>
          </div>
        </div>
      )}

      {step === "format" && preview && (
        <div className="mt-4 space-y-4">
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
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border border-border/60",
                  format === option.value ? "bg-primary text-primary-foreground border-primary/30" : "bg-muted/40 text-muted-foreground"
                )}>
                  <option.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep("preview")}>
              Back
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
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
          </div>
        </div>
      )}
    </div>
  );
}
