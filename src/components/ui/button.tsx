import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "accent";
type Size = "sm" | "md" | "lg" | "xl";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover shadow-[0_0_0_1px_rgba(124,108,246,0.4)] focus-visible:ring-primary",
  secondary:
    "bg-background-card text-foreground border border-border hover:border-primary/60 hover:bg-background-elevated focus-visible:ring-primary",
  ghost: "bg-transparent text-muted hover:text-foreground hover:bg-white/5 focus-visible:ring-primary",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25 focus-visible:ring-danger",
  success: "bg-success/15 text-success border border-success/40 hover:bg-success/25 focus-visible:ring-success",
  accent: "bg-accent text-black hover:brightness-110 focus-visible:ring-accent",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-xl gap-2",
  lg: "text-base px-6 py-3.5 rounded-xl gap-2.5",
  xl: "text-lg px-8 py-5 rounded-2xl gap-3 font-semibold",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
