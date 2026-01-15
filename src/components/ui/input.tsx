import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input component following calm minimal dashboard aesthetic
 * - White surface, subtle border
 * - Radius: 12-14px
 * - Focus ring is soft teal at low opacity
 * - Placeholder text uses muted color
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary/20 selection:text-foreground border-border/70 h-10 w-full min-w-0 rounded-lg border bg-background px-3.5 py-2 text-sm transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
