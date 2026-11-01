import type { CandidateStatus } from "./types";

export const STATUS_LABEL_TEXT: Record<CandidateStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  rejected: "Rejected",
  selected: "Selected",
  details_submitted: "Details submitted",
  onboarded: "Onboarded",
};
