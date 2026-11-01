// Turns Supabase/SQL errors into copy a candidate or HR person can act on.

const COPY: Record<string, string> = {
  already_applied: "You've already applied to this drive.",
  drive_not_found: "This drive doesn't exist.",
  drive_closed: "Applications for this drive are closed.",
  application_not_found: "We couldn't find that application.",
  not_selected: "Joining details open once you're selected.",
  not_ready: "This candidate isn't at that step yet.",
  not_hr: "This account doesn't have HR access.",
  not_authenticated: "Please sign in again.",
  reason_required: "Tell the candidate what to change.",
  invalid_decision: "That action isn't available.",
  rounds_locked: "Rounds are locked once candidates have applied.",
  invalid_rounds: "Give each round its own name (1 to 8 rounds).",
  "User already registered":
    "An account with this email already exists. Sign in to apply.",
  "Invalid login credentials": "Email or password is incorrect.",
};

export const FALLBACK_ERROR = "Something went wrong. Please try again.";

export function friendlyError(e: unknown): string {
  const message =
    e && typeof e === "object" && "message" in e
      ? String((e as { message: unknown }).message)
      : "";
  return COPY[message] ?? FALLBACK_ERROR;
}
