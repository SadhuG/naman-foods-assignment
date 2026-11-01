import { Check, Pause, X } from "lucide-react";
import { cn } from "../../components/ui/cn";
import { ROUND_BLURBS, shortDate } from "../../lib/copy";
import type { StepState, TimelineStep } from "./progress";

const DOT: Record<StepState, string> = {
  done: "bg-status-selected-bg text-status-selected-fg",
  current: "bg-accent-default text-fg-on-accent",
  on_hold: "bg-status-on_hold-bg text-status-on_hold-fg",
  rejected: "bg-status-rejected-bg text-status-rejected-fg",
  upcoming: "bg-surface-sunken text-neutral-600",
};

function describe(step: TimelineStep, prev: TimelineStep | undefined) {
  switch (step.state) {
    case "done":
      return step.message ? `Cleared. ${step.message}` : "Cleared.";
    case "current":
      return (
        step.message ?? ROUND_BLURBS[step.name] ?? "This is your current round."
      );
    case "on_hold":
      return "On hold: we'll be in touch.";
    case "rejected":
      return "We won't be moving ahead this time. Thank you for the time you gave us; we'd be glad to see you apply again.";
    case "upcoming":
      return prev ? `Opens once you clear the ${prev.name}.` : "";
  }
}

function label(step: TimelineStep, steps: TimelineStep[]) {
  if (step.date) return shortDate(step.date);
  if (step.state === "current") return "Now";
  if (step.state === "upcoming") {
    const firstUpcoming = steps.find((s) => s.state === "upcoming");
    return firstUpcoming === step ? "Next" : "";
  }
  return "";
}

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol>
      {steps.map((s, i) => {
        const Icon =
          s.state === "done"
            ? Check
            : s.state === "on_hold"
              ? Pause
              : s.state === "rejected"
                ? X
                : null;
        const last = i === steps.length - 1;
        return (
          <li
            key={s.position}
            className="flex gap-3"
            aria-current={s.state === "current" ? "step" : undefined}
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-small font-medium",
                  DOT[s.state],
                )}
              >
                {Icon ? <Icon aria-hidden className="size-3.5" /> : s.position}
              </span>
              {!last && (
                <span
                  className={cn(
                    "my-1 w-0.5 flex-1",
                    s.state === "done"
                      ? "bg-status-selected-fg"
                      : "bg-border-default",
                  )}
                />
              )}
            </div>
            <div className={cn("min-w-0 flex-1", !last && "pb-5")}>
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={cn(
                    s.state === "current" ? "text-title" : "text-body",
                    s.state === "upcoming" && "text-fg-secondary",
                  )}
                >
                  <span className="sr-only">
                    {
                      {
                        done: "Cleared: ",
                        current: "Current round: ",
                        on_hold: "On hold: ",
                        rejected: "Closed: ",
                        upcoming: "Upcoming: ",
                      }[s.state]
                    }
                  </span>
                  {s.name}
                </p>
                <span className="shrink-0 font-mono text-small text-fg-secondary">
                  {label(s, steps)}
                </span>
              </div>
              <p className="mt-0.5 text-small text-fg-secondary">
                {describe(s, steps[i - 1])}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
