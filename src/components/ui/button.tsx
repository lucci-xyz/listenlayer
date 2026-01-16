import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button component following calm minimal dashboard aesthetic
 * - Primary: subtle white surface with teal border/text OR very light teal tint
 * - Secondary: white surface + border
 * - Icon buttons: circular/rounded, low-contrast hover
 * - Radius: 12-14px
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        // Primary
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        // Destructive
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/30",
        // Outline
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted/40",
        // Secondary
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Ghost
        ghost:
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Soft
        soft: "border border-primary/15 bg-primary/10 text-primary hover:bg-primary/15",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3 text-[13px]",
        lg: "h-11 rounded-lg px-5 text-base",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
