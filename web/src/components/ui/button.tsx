import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-accent text-primary shadow-card hover:-translate-y-0.5 hover:bg-accent-hover",
        secondary: "border border-line bg-white text-primary hover:border-primary/40 hover:-translate-y-0.5 dark:bg-base-100",
        ghost: "text-primary hover:bg-base-100",
      },
      size: {
        sm: "px-3 py-2",
        md: "px-4 py-3",
        lg: "px-5 py-3.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
