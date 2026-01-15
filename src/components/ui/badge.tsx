import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge component following calm minimal dashboard aesthetic
 * - Very light tinted background + muted text
 * - No hard outlines unless needed
 * - Radius: 999px (pill shape)
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        // Default: primary teal tint
        default:
          "border border-primary/15 bg-primary/10 text-primary",
        // Secondary: neutral surface
        secondary:
          "border border-border/60 bg-muted/50 text-muted-foreground",
        // Destructive: muted red tint
        destructive:
          "border border-destructive/20 bg-destructive/10 text-destructive",
        // Success: muted green tint
        success:
          "border border-success/20 bg-success/10 text-success",
        // Warning: muted amber/peach tint
        warning:
          "border border-warning/20 bg-warning/15 text-warning-foreground",
        // Outline: just border
        outline:
          "border border-border/70 bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
