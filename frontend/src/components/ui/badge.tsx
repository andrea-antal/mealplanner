import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Tag variants for meal planner
        toddler: "border-transparent bg-tag-toddler text-primary-foreground",
        quick: "border-transparent bg-tag-quick text-foreground",
        daycare: "border-transparent bg-tag-daycare text-primary-foreground",
        approved: "border-transparent bg-tag-approved text-primary-foreground",
        onepot: "border-transparent bg-tag-onepot text-primary-foreground",
        batch: "border-transparent bg-tag-batch text-primary-foreground",
        breakfast: "border-transparent bg-tag-breakfast text-primary-foreground",
        leftover: "border-transparent bg-tag-leftover text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
