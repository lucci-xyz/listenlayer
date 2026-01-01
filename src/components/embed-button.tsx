"use client";

import { useState } from "react";
import { EmbedConfig } from "@/lib/embed";
import { Button } from "@/components/ui/button";
import { EmbedModal } from "@/components/embed-modal";

export function EmbedButton({
  label = "Copy embed",
  size = "default",
  variant = "outline",
  publicId,
  baseUrl,
  config,
  disabled,
}: {
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  publicId: string | null;
  baseUrl: string;
  config: EmbedConfig;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isDisabled = disabled || !publicId;

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)} disabled={isDisabled}>
        {label}
      </Button>
      <EmbedModal
        open={open}
        onOpenChange={setOpen}
        publicId={publicId}
        baseUrl={baseUrl}
        config={config}
      />
    </>
  );
}
