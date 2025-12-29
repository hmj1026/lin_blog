import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

const badgeStyles = cva("inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-base-100 text-primary border-line",
      success: "bg-green-50/90 backdrop-blur-sm text-green-800 border-green-300",
      info: "bg-blue-50/90 backdrop-blur-sm text-blue-800 border-blue-300",
      warning: "bg-yellow-50/90 backdrop-blur-sm text-yellow-800 border-yellow-300",
      accent: "bg-orange-50 text-accent-600 border-orange-200",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BadgeProps = VariantProps<typeof badgeStyles> & { 
  children: ReactNode;
  className?: string;
};

export function Badge({ children, variant, className }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)}>{children}</span>;
}
