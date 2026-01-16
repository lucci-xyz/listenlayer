import { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  retry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {message && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      )}
      {(retry || action) && (
        <div className="mt-4 flex gap-2">
          {retry && (
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
