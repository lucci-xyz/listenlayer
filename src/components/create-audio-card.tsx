"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ChevronDown, Mic, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formats = [
  { value: "narration", label: "Solo", icon: Mic },
  { value: "two-host", label: "Two hosts", icon: Users },
  { value: "tldr", label: "TL;DR", icon: Zap },
] as const;

type Format = (typeof formats)[number]["value"];

export function CreateAudioCard() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("narration");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const selectedFormat = formats.find((f) => f.value === format) || formats[0];
  const FormatIcon = selectedFormat.icon;

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
    <div 
      className={cn(
        "relative flex items-center w-full rounded-2xl bg-white border-2 p-1.5 shadow-sm transition-all duration-300",
        isFocused ? "border-primary/30 ring-4 ring-primary/5 scale-[1.01]" : "border-transparent ring-1 ring-border"
      )}
    >
      {/* URL Input */}
      <input
        type="text"
        placeholder="Paste an article link to generate audio..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={(e) => e.key === "Enter" && !loading && url.trim() && handleGenerate()}
        disabled={loading}
        className="flex-1 bg-transparent px-4 py-3 text-lg outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
      />

      {/* Controls Group */}
      <div className="flex items-center gap-2 pl-2">
        {/* Format Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <FormatIcon className="h-4 w-4 text-primary" strokeWidth={2} />
              <span>{selectedFormat.label}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {formats.map((f) => (
              <DropdownMenuItem 
                key={f.value} 
                onClick={() => setFormat(f.value)}
                className="gap-3 py-2.5"
              >
                <f.icon className={cn("h-4 w-4", format === f.value ? "text-primary" : "text-muted-foreground")} />
                <span className={format === f.value ? "font-medium" : ""}>{f.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Create Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={loading || !url.trim()} 
          size="lg"
          className="h-12 rounded-xl px-6 text-base font-medium shadow-md transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Create
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
