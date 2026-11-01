import type { ComponentProps } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent-default text-fg-on-accent hover:bg-accent-hover",
  secondary:
    "border border-border-strong bg-surface-raised text-fg-primary hover:bg-surface-sunken",
  ghost: "text-fg-primary hover:bg-surface-sunken",
  danger: "bg-danger-default text-fg-on-accent hover:bg-danger-hover",
};

const DISABLED =
  "disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-sunken disabled:text-fg-disabled";

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: "sm" | "md" = "md",
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md text-label whitespace-nowrap transition-colors",
    // 44 px tall on touch-sized screens, Figma's 36 px from sm up
    size === "md" ? "h-11 px-4 sm:h-9" : "h-10 px-3 sm:h-8",
    VARIANTS[variant],
  );
}

type Props = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
};

/** While loading the button keeps its colour (as in Figma) but ignores clicks. */
export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  type = "button",
  onClick,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        buttonClass(variant, size),
        !loading && DISABLED,
        loading && "cursor-progress",
        className,
      )}
      disabled={disabled && !loading}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
