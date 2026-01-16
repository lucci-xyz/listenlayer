import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({
  message = "Loading...",
  className,
  size = "md",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12",
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {message && (
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card p-6 shadow-soft",
        className
      )}
    >
      <div className="flex animate-pulse flex-col gap-4">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-8 w-1/2 rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export function LoadingRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse items-center justify-between rounded-md border border-border bg-background px-4 py-3",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted" />
      </div>
      <div className="h-6 w-16 rounded bg-muted" />
    </div>
  );
}
