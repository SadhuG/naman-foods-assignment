import { Download, Pause } from "lucide-react";
import { Button } from "../../components/ui/Button";
import type { Decision } from "../../lib/types";

/** Dark bar pinned to the bottom while rows are selected. */
export function BulkBar({
  count,
  actions,
  approveLabel,
  onAction,
  onClear,
  onExport,
}: {
  count: number;
  actions: Decision[];
  approveLabel: string;
  onAction: (d: Decision) => void;
  onClear: () => void;
  onExport: () => void;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
    >
      <div className="flex w-full max-w-190 items-center gap-3 rounded-lg bg-surface-inverse py-2 pr-2 pl-4 text-fg-inverse shadow-2xl">
        <p className="text-label" aria-live="polite">
          {count} selected
        </p>
        <button
          onClick={onClear}
          className="rounded-sm px-1 text-label text-neutral-400 hover:text-fg-inverse"
        >
          Clear
        </button>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-sm px-1 text-label text-neutral-400 hover:text-fg-inverse"
        >
          <Download aria-hidden className="size-4" /> Export
        </button>
        <div className="flex-1" />
        {actions.length === 0 && (
          <p className="text-small text-neutral-400">
            No round decisions for this selection.
          </p>
        )}
        {actions.includes("on_hold") && (
          <Button variant="secondary" onClick={() => onAction("on_hold")}>
            <Pause aria-hidden className="size-4" /> Put on hold
          </Button>
        )}
        {actions.includes("rejected") && (
          <Button variant="danger" onClick={() => onAction("rejected")}>
            Reject
          </Button>
        )}
        {actions.includes("reopened") && (
          <Button variant="secondary" onClick={() => onAction("reopened")}>
            Reopen
          </Button>
        )}
        {actions.includes("approved") && (
          <Button onClick={() => onAction("approved")}>{approveLabel}</Button>
        )}
      </div>
    </div>
  );
}
