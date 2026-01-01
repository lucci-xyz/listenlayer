"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function GenerateButton({
  siteId,
  sourceId,
  count = 1,
  label,
  format,
  size = "sm",
}: {
  siteId: string;
  sourceId: string;
  count?: number;
  label?: string;
  format?: "narration" | "two-host" | "tldr";
  size?: "sm" | "default" | "lg";
}) {
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
        body: JSON.stringify({ siteId, sourceId, count, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to generate");
      }
      toast.success("Episode queued.", {
        action: {
          label: "Copy embed",
          onClick: () => router.push("/app/embed"),
        },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button size={size} onClick={handleClick} disabled={loading}>
        {loading ? "Queueing..." : label || `Generate ${count > 1 ? `${count} episodes` : "latest"}`}
      </Button>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
