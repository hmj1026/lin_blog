import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

export const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-white/90 backdrop-blur-sm text-primary border border-accent shadow-sm hover:shadow-[0_0_0_3px_rgba(255,208,80,0.2)] hover:-translate-y-0.5 hover:bg-white/95 active:scale-[0.98]",
        secondary: "bg-white/85 backdrop-blur-sm border border-purple/30 text-primary hover:border-purple/50 hover:shadow-[0_0_0_3px_rgba(89,46,169,0.15)] hover:-translate-y-0.5 hover:bg-white/90 active:scale-[0.98] dark:bg-base-100/85",
        ghost: "text-primary hover:bg-neutral-50/60 hover:backdrop-blur-sm active:scale-[0.98]",
        danger: "bg-red-50/90 backdrop-blur-sm text-red-800 border border-red-300 shadow-sm hover:shadow-[0_0_0_3px_rgba(239,68,68,0.2)] hover:-translate-y-0.5 hover:bg-red-50/95 active:scale-[0.98]",
        outline: "border border-purple bg-transparent backdrop-blur-sm text-purple hover:bg-white/50 hover:border-purple-700 active:scale-[0.98]",
        link: "text-purple underline underline-offset-4 decoration-purple/30 hover:text-purple-700 hover:decoration-purple/50",
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
