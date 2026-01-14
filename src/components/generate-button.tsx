"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type GenerateButtonProps = {
  feedId: string;
  count?: number;
  label?: string;
  format?: "narration" | "two-host" | "tldr";
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

export function GenerateButton({
  feedId,
  count = 1,
  label,
  format,
  size = "sm",
  variant = "default",
}: GenerateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/episodes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId, count, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to generate");
      }
      toast.success(count > 1 ? `${count} episodes queued.` : "Episode queued.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button size={size} variant={variant} onClick={handleClick} disabled={loading}>
        {loading ? "Queueing..." : label || `Generate ${count > 1 ? `${count} episodes` : "latest"}`}
      </Button>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
