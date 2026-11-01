import { CircleCheck, CircleX, Info, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "success" | "warning" | "danger";
const TONE: Record<Tone, [bg: string, fg: string, icon: LucideIcon]> = {
  neutral: ["bg-surface-sunken", "text-fg-primary", Info],
  success: ["bg-status-selected-bg", "text-status-selected-fg", CircleCheck],
  warning: ["bg-status-on_hold-bg", "text-status-on_hold-fg", Info],
  danger: ["bg-danger-soft", "text-danger-default", CircleX],
};

export function Banner({
  tone = "neutral",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const [bg, fg, Icon] = TONE[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md px-4 py-3", bg, className)}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", fg)} />
      <div className="min-w-0">
        <p className={cn("text-label", fg)}>{title}</p>
        {children && (
          <div className="mt-0.5 text-small text-fg-primary">{children}</div>
        )}
      </div>
    </div>
  );
}
