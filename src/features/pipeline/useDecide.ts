import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { decide, pipelineKeys } from "../../lib/api/candidates";
import { decisionToast, nextStageLabel } from "../../lib/pipeline";
import type { Candidate, Decision, DriveRound } from "../../lib/types";

/** Where an approval sends these candidates: one round name, or "the next round" when mixed. */
export function approveTarget(cs: Candidate[], rounds: DriveRound[]): string {
  const labels = new Set(
    cs
      .filter((c) => c.status === "active" || c.status === "on_hold")
      .map((c) => nextStageLabel(c, rounds)),
  );
  return labels.size === 1 ? [...labels][0]! : "the next round";
}

export function useDecide(driveId: string, rounds: DriveRound[]) {
  const queryClient = useQueryClient();
  return async (
    cs: Candidate[],
    decision: Decision,
    note?: string,
    message?: string,
  ) => {
    const result = await decide(cs, decision, note, message);
    toast.success(decisionToast(decision, result, approveTarget(cs, rounds)));
    // Saved: let the dialog close now and refresh the lists behind it.
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: pipelineKeys.list(driveId) }),
      queryClient.invalidateQueries({ queryKey: ["candidate"] }),
      queryClient.invalidateQueries({ queryKey: ["drives"] }),
    ]);
    return result;
  };
}

/** "move from Technical Interview to HR Interview", used under each decision option. */
export function describeMoveFor(cs: Candidate[], rounds: DriveRound[]) {
  const roundName = (p: number) =>
    rounds.find((r) => r.position === p)?.name ?? `Round ${p}`;
  const positions = new Set(cs.map((c) => c.current_round));
  const here =
    positions.size === 1 ? roundName([...positions][0]!) : "their round";
  const next = approveTarget(cs, rounds);
  return (d: Decision) => {
    switch (d) {
      case "approved":
        return next === "Selected"
          ? `move from ${here} to Selected`
          : `move from ${here} to ${next}`;
      case "on_hold":
        return `stay in ${here}, on hold`;
      case "rejected":
        return "end their application for this drive";
      case "reopened":
        return `go back to ${here} as active`;
    }
  };
}
