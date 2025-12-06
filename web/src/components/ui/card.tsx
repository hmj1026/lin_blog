import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardStyles = cva("rounded-2xl border border-line bg-white shadow-card dark:bg-base-100", {
  variants: {
    padding: {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    padding: "md",
  },
});

type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardStyles>;

export function Card({ className, padding, ...props }: CardProps) {
  return <div className={cn(cardStyles({ padding }), className)} {...props} />;
}
