import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

const inputStyles = cva(
  "w-full rounded-xl border bg-white px-4 py-3 text-sm text-primary outline-none transition focus:ring focus:ring-accent/30 dark:bg-base-50",
  {
    variants: {
      state: {
        default: "border-line shadow-inner",
        subtle: "border-transparent bg-base-50",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

type InputProps = InputHTMLAttributes<HTMLInputElement> & VariantProps<typeof inputStyles>;

export function Input({ className, state, ...props }: InputProps) {
  return <input className={cn(inputStyles({ state }), className)} {...props} />;
}
