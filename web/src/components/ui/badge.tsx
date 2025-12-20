import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeStyles = cva("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", {
  variants: {
    tone: {
      accent: "bg-orange-50 text-accent-600 border-orange-200",
      muted: "bg-base-100 text-primary border-line",
    },
  },
  defaultVariants: {
    tone: "muted",
  },
});

type BadgeProps = VariantProps<typeof badgeStyles> & { label: string };

export function Badge({ label, tone }: BadgeProps) {
  return <span className={cn(badgeStyles({ tone }))}>{label}</span>;
}
