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
        <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {label}
        </div>
        <Button size="sm" variant="outline" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div
        className={`rounded-lg border border-border bg-muted px-3 py-2 text-[12px] text-foreground ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
