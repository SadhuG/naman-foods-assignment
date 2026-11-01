import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  title,
  body,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-100 flex-col items-center px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-full bg-surface-sunken text-fg-secondary">
        <Icon aria-hidden className="size-4.5" />
      </span>
      <h2 className="mt-4 text-title">{title}</h2>
      <div className="mt-2 text-body text-fg-secondary">{body}</div>
      {action && (
        <div className="mt-5 flex flex-col items-center gap-3">{action}</div>
      )}
    </div>
  );
}
