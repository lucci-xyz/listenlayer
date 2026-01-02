"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-white border border-border text-foreground shadow-soft-lg",
          description: "text-muted-foreground",
          actionButton: "bg-neutral-900 text-white",
          cancelButton: "bg-muted text-foreground",
        },
      }}
    />
  );
}
