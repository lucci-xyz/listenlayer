"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const formats = [
  { value: "narration", label: "Solo" },
  { value: "two-host", label: "Two hosts" },
  { value: "tldr", label: "TL;DR" },
] as const;

type Format = (typeof formats)[number]["value"];

export function CreateAudioCard() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("narration");
  const [loading, setLoading] = useState(false);

  const selectedFormat = formats.find((f) => f.value === format) || formats[0];

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setLoading(true);

    try {
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
        throw new Error(data.error || "Failed to generate");
      }

      toast.success("Started generating");
      setUrl("");
      
      if (data.episodeId) {
        router.push(`/app/episodes/${data.episodeId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex gap-2">
        <Input
          placeholder="Paste article URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && url.trim() && handleGenerate()}
          disabled={loading}
          className="flex-1"
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={loading} className="gap-1.5 min-w-[90px]">
              {selectedFormat.label}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {formats.map((f) => (
              <DropdownMenuItem key={f.value} onClick={() => setFormat(f.value)}>
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={handleGenerate} disabled={loading || !url.trim()} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Create</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
