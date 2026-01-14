"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const formats = [
  { value: "narration", label: "Solo narration", description: "Single voice reads the article" },
  { value: "two-host", label: "Two hosts", description: "Conversational podcast style" },
  { value: "tldr", label: "TL;DR", description: "Quick summary version" },
] as const;

type Format = (typeof formats)[number]["value"];

export function CreateAudioCard() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("narration");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFormat = formats.find((f) => f.value === format) || formats[0];

  const handleGenerate = async () => {
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    try {
      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = "https://" + normalizedUrl;
      }

      const res = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, format }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error("You're out of credits. Upgrade to continue.");
        }
        throw new Error(data.error || "Failed to generate episode");
      }

      toast.success("Generation started!");
      setUrl("");
      
      // Navigate to the episode page
      if (data.episodeId) {
        router.push(`/app/episodes/${data.episodeId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && url.trim()) {
      handleGenerate();
    }
  };

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Paste any article URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="h-11 border-violet-500/20 bg-background/80 text-base placeholder:text-muted-foreground/60"
            />
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 gap-2 border-violet-500/20" disabled={loading}>
                  {selectedFormat.label}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {formats.map((f) => (
                  <DropdownMenuItem
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="font-medium">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleGenerate}
              disabled={loading || !url.trim()}
              className="h-11 gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Create audio</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
