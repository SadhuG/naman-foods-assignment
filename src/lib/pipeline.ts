// Pipeline rules on the client. allowedDecisions mirrors hr_decide in
// supabase/migrations/0004_hr_rpc.sql; the database stays the authority.
import type {
  Candidate,
  CandidateStatus,
  Decision,
  DriveRound,
  StageKey,
} from "./types";

const AFTER_ROUNDS = new Set<CandidateStatus>([
  "selected",
  "details_submitted",
  "onboarded",
]);

export function stageOf(
  c: Pick<Candidate, "status" | "current_round">,
): StageKey {
  if (c.status === "rejected") return "rejected";
  if (AFTER_ROUNDS.has(c.status)) return "selected";
  return `round-${c.current_round}`;
}

export function filterByStage(cs: Candidate[], stage: StageKey): Candidate[] {
  return stage === "all" ? cs : cs.filter((c) => stageOf(c) === stage);
}

export function countByStage(
  cs: Candidate[],
  rounds: DriveRound[],
): Record<StageKey, number> {
  const counts: Record<string, number> = {};
  for (const r of rounds) counts[`round-${r.position}`] = 0;
  counts.selected = 0;
  counts.rejected = 0;
  counts.all = cs.length;
  for (const c of cs) {
    const k = stageOf(c);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts as Record<StageKey, number>;
}

export function allowedDecisions(status: CandidateStatus): Decision[] {
  switch (status) {
    case "active":
      return ["approved", "on_hold", "rejected"];
    case "on_hold":
      return ["approved", "rejected"];
    case "rejected":
      return ["reopened"];
    default:
      return [];
  }
}

export function nextStageLabel(
  c: Pick<Candidate, "current_round">,
  rounds: DriveRound[],
): string {
  const next = rounds.find((r) => r.position === c.current_round + 1);
  return next ? next.name : "Selected";
}

export function matchesSearch(
  c: Pick<Candidate, "full_name" | "email" | "phone">,
  q: string,
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [c.full_name, c.email, c.phone].some((v) =>
    v.toLowerCase().includes(needle),
  );
}

export function decisionToast(
  decision: Decision,
  r: { moved: number; skipped: number },
  nextLabel: string,
): string {
  const head = {
    approved: `${r.moved} moved to ${nextLabel}`,
    on_hold: `${r.moved} put on hold`,
    rejected: `${r.moved} rejected`,
    reopened: `${r.moved} reopened`,
  }[decision];
  return r.skipped > 0
    ? `${head} · ${r.skipped} skipped (already decided)`
    : head;
}

export const DECISION_LABEL: Record<Decision, string> = {
  approved: "Approve",
  on_hold: "Hold",
  rejected: "Reject",
  reopened: "Reopen",
};
