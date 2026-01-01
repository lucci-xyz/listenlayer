"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {label}
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div
        className={`rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
