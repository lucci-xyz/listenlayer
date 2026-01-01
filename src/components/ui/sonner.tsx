"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-white border border-zinc-200 text-zinc-900 shadow-lg",
          description: "text-zinc-500",
          actionButton: "bg-zinc-900 text-white",
          cancelButton: "bg-zinc-100 text-zinc-900",
        },
      }}
    />
  );
}
