import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export type OverlayProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Dialog width: md 560 px, lg 1120 px. Drawers: md 520 px, lg 560 px. */
  size?: "md" | "lg";
};

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Shared modal plumbing: Escape closes, focus moves in, stays in, and returns; page scroll locks. */
export function Overlay({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  kind,
  className,
  size = "md",
}: OverlayProps & { kind: "dialog" | "drawer" }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(
      "[autofocus], input:not([type=checkbox]), textarea, select",
    );
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      // Only the topmost overlay reacts (a dialog can open over a drawer).
      const all = document.querySelectorAll(
        '[role="dialog"][aria-modal="true"]',
      );
      if (all[all.length - 1] !== panel.current) return;
      if (e.key === "Escape") close.current();
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex",
        kind === "dialog" ? "items-center justify-center p-4" : "justify-end",
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-surface-inverse/40"
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-full flex-col bg-surface-raised shadow-2xl outline-none",
          kind === "dialog"
            ? cn("w-full rounded-xl", size === "lg" ? "max-w-280" : "max-w-140")
            : cn("h-full w-full", size === "lg" ? "max-w-140" : "max-w-130"),
          className,
        )}
      >
        <header className="flex items-start gap-4 px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-heading">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-small text-fg-secondary">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-m-1 rounded-md p-1 text-fg-secondary hover:bg-surface-sunken hover:text-fg-primary"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {children}
        </div>
        {footer && (
          <footer
            className={cn(
              "flex justify-end gap-2 border-t border-border-default bg-surface-canvas px-6 py-4",
              kind === "dialog" && "rounded-b-xl",
            )}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
