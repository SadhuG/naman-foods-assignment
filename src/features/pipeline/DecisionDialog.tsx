import { CircleCheck, CircleX, Info, Pause, RotateCcw } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { FieldError, Textarea } from "../../components/ui/Field";
import { cn } from "../../components/ui/cn";
import { friendlyError } from "../../lib/api/errors";
import { allowedDecisions } from "../../lib/pipeline";
import type { Candidate, Decision } from "../../lib/types";

const OPTION: Record<
  Decision,
  { label: string; icon: typeof Info; tone: string; verb: string }
> = {
  approved: {
    label: "Approve",
    icon: CircleCheck,
    tone: "text-status-selected-fg",
    verb: "Approve",
  },
  on_hold: {
    label: "Put on hold",
    icon: Pause,
    tone: "text-status-on_hold-fg",
    verb: "Hold",
  },
  rejected: {
    label: "Reject",
    icon: CircleX,
    tone: "text-danger-default",
    verb: "Reject",
  },
  reopened: {
    label: "Reopen",
    icon: RotateCcw,
    tone: "text-status-active-fg",
    verb: "Reopen",
  },
};

const people = (n: number) => (n === 1 ? "candidate" : "candidates");

function names(cs: Candidate[]): string {
  const first = cs.map((c) => c.full_name.split(/[\s,]+/)[0]);
  if (first.length <= 3)
    return first.length > 1
      ? `${first.slice(0, -1).join(", ")} and ${first.at(-1)}`
      : (first[0] ?? "");
  return `${first.slice(0, 2).join(", ")} and ${first.length - 2} others`;
}

export type DecisionPreview = (args: {
  decision: Decision;
  message: string;
  candidates: Candidate[];
}) => ReactNode;

/**
 * Confirms a decision for one or many candidates. Two separate fields: an
 * HR-only internal note and an optional message that goes to the candidate.
 */
export function DecisionDialog({
  open,
  onClose,
  decision: initial,
  candidates,
  options,
  describeMove,
  onConfirm,
  previewSlot,
}: {
  open: boolean;
  onClose: () => void;
  decision: Decision;
  candidates: Candidate[];
  /** Decisions offered as radio choices; defaults to just `decision`. */
  options?: Decision[];
  describeMove: (d: Decision) => string;
  onConfirm: (
    d: Decision,
    note?: string,
    candidateMessage?: string,
  ) => Promise<void>;
  previewSlot?: DecisionPreview;
}) {
  const [decision, setDecision] = useState(initial);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();
  const msgId = useId();

  useEffect(() => {
    if (open) {
      setDecision(initial);
      setNote("");
      setMessage("");
      setError(null);
    }
  }, [open, initial]);

  const eligible = candidates.filter((c) =>
    allowedDecisions(c.status).includes(decision),
  );
  const skipped = candidates.length - eligible.length;
  const n = candidates.length;
  const opt = OPTION[decision];
  const choices = options ?? [initial];

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(
        decision,
        note.trim() || undefined,
        message.trim() || undefined,
      );
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const title =
    decision === "rejected"
      ? `Reject ${n} ${people(n)}?`
      : `${opt.verb} ${n} ${people(n)}`;
  const preview = previewSlot?.({ decision, message, candidates: eligible });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={`${names(candidates)} ${describeMove(decision)}.`}
      size={preview ? "lg" : "md"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={decision === "rejected" ? "danger" : "primary"}
            loading={busy}
            disabled={eligible.length === 0}
            onClick={confirm}
          >
            {opt.verb} {eligible.length} and notify
          </Button>
        </>
      }
    >
      <div
        className={cn("grid gap-8", !!preview && "lg:grid-cols-[440px_1fr]")}
      >
        <div className="flex flex-col gap-4">
          {choices.length > 1 && (
            <fieldset>
              <legend className="mb-2 text-label">Decision</legend>
              <div className="flex flex-col gap-2">
                {choices.map((d) => {
                  const o = OPTION[d];
                  const Icon = o.icon;
                  const on = d === decision;
                  return (
                    <label
                      key={d}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3",
                        on
                          ? "border-border-focus bg-surface-brand"
                          : "border-border-default hover:bg-surface-hover",
                      )}
                    >
                      <Icon aria-hidden className={cn("size-4", o.tone)} />
                      <span className="flex-1">
                        <span className="block text-label">{o.label}</span>
                        <span className="block text-small text-fg-secondary first-letter:uppercase">
                          {describeMove(d)}
                        </span>
                      </span>
                      <input
                        type="radio"
                        name="decision"
                        checked={on}
                        onChange={() => setDecision(d)}
                        className="size-4 accent-accent-default"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={noteId} className="text-label">
              Internal note · HR only
            </label>
            <Textarea
              id={noteId}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-describedby={`${noteId}-hint`}
            />
            <p id={`${noteId}-hint`} className="text-small text-fg-secondary">
              Only HR sees this. Never shown to candidates and never included in
              messages.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={msgId} className="text-label">
              Message to {n === 1 ? "candidate" : "candidates"} (optional)
            </label>
            <Textarea
              id={msgId}
              rows={3}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-describedby={`${msgId}-hint`}
            />
            <p id={`${msgId}-hint`} className="text-small text-fg-secondary">
              Included in the email they receive and on their timeline (not the
              SMS).
            </p>
          </div>
          <div className="flex gap-3 rounded-md bg-surface-sunken px-4 py-3">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="text-small">
              <p className="text-label">
                {skipped === 0
                  ? n === 1
                    ? "Ready to go"
                    : `All ${n} can move`
                  : `${eligible.length} of ${n} can move`}
              </p>
              <p className="mt-0.5">
                {skipped === 0
                  ? "Anyone who can't take this step is skipped and gets no message. You'll see both counts after you confirm."
                  : `${skipped} already decided ${skipped === 1 ? "is" : "are"} skipped and get no message.`}
              </p>
            </div>
          </div>
          {error && <FieldError>{error}</FieldError>}
        </div>
        {!!preview && <div className="min-w-0">{preview}</div>}
      </div>
    </Dialog>
  );
}
