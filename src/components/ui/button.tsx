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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        // Primary: light teal tint background with teal text
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Destructive: muted red
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
        // Outline: white surface + subtle border + teal text
        outline:
          "border border-border bg-card text-foreground hover:bg-secondary hover:border-border",
        // Secondary: very light surface
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // Ghost: transparent with subtle hover
        ghost:
          "text-muted-foreground hover:bg-secondary hover:text-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Soft teal variant - light teal background
        soft: "bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg gap-1.5 px-3.5 text-[13px]",
        lg: "h-11 rounded-xl px-5",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
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
