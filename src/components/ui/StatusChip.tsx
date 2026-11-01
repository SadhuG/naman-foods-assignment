import type { CandidateStatus } from "../../lib/types";
import { cn } from "./cn";

export const STATUS_LABEL: Record<CandidateStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  rejected: "Rejected",
  selected: "Selected",
  details_submitted: "Details submitted",
  onboarded: "Onboarded",
};

const TONE: Record<CandidateStatus, string> = {
  active: "bg-status-active-bg text-status-active-fg",
  on_hold: "bg-status-on_hold-bg text-status-on_hold-fg",
  rejected: "bg-status-rejected-bg text-status-rejected-fg",
  selected: "bg-status-selected-bg text-status-selected-fg",
  details_submitted:
    "bg-status-details_submitted-bg text-status-details_submitted-fg",
  onboarded: "bg-status-onboarded-bg text-status-onboarded-fg",
};

export function StatusChip({
  status,
  className,
}: {
  status: CandidateStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-label whitespace-nowrap",
        TONE[status],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
