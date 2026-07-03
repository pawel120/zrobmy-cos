import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Default stays zinc/bordered, deliberately NOT orange — orange is
        // reserved for the 🔥 mechanic, badges, and active states only.
        default: "border border-zinc-800 bg-zinc-950 text-zinc-50 hover:border-zinc-600",
        outline: "border border-zinc-800 bg-transparent text-zinc-300 hover:border-zinc-600 hover:text-zinc-50",
        ghost: "text-zinc-400 hover:text-zinc-100",
        link: "text-zinc-100 underline-offset-4 hover:underline hover:text-ogien",
        // Reserved for genuine 🔥/active-state affordances.
        accent: "border border-ogien/50 bg-ogien/10 text-ogien hover:border-ogien",
        destructive: "border border-ogien bg-ogien/10 text-ogien hover:bg-ogien/20",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
