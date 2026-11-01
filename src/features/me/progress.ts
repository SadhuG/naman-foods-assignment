import type { CandidateStatus, MyApplication } from "../../lib/types";

export type StepState =
  "done" | "current" | "on_hold" | "rejected" | "upcoming";

export type TimelineStep = {
  position: number;
  name: string;
  state: StepState;
  /** Date of the decision that settled this step, if any. */
  date: string | null;
  /** The HR team's message to the candidate for this round, if any. */
  message: string | null;
};

const AFTER_ROUNDS: CandidateStatus[] = [
  "selected",
  "details_submitted",
  "onboarded",
];

/** One step per round, from the candidate's status and the decisions they're allowed to see. */
export function buildTimeline(app: MyApplication): TimelineStep[] {
  const finished = AFTER_ROUNDS.includes(app.status);
  return app.rounds.map((r) => {
    const decisions = app.timeline.filter(
      (t) => t.round_position === r.position,
    );
    const last = decisions.at(-1) ?? null;
    let state: StepState;
    if (finished || r.position < app.current_round) state = "done";
    else if (r.position > app.current_round) state = "upcoming";
    else if (app.status === "on_hold") state = "on_hold";
    else if (app.status === "rejected") state = "rejected";
    else state = "current";
    const settled = state !== "current" && state !== "upcoming";
    const latestMessage =
      [...decisions].reverse().find((d) => d.candidate_message)
        ?.candidate_message ?? null;
    return {
      position: r.position,
      name: r.name,
      state,
      date: settled && last ? last.decided_at : null,
      message: state === "upcoming" ? null : latestMessage,
    };
  });
}

/** The most recent message from the hiring team across all rounds. */
export function latestNote(app: MyApplication): string | null {
  return (
    [...app.timeline].reverse().find((t) => t.candidate_message)
      ?.candidate_message ?? null
  );
}
