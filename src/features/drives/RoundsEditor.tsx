import { ArrowDown, ArrowUp, Lock, Plus, X } from "lucide-react";
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { FieldError } from "../../components/ui/Field";
import { cn } from "../../components/ui/cn";
import { MAX_ROUNDS } from "../../lib/drives";
import type { DriveFormOutput, DriveFormShape } from "./DriveForm";

type RoundError = { message?: string; name?: { message?: string } } | undefined;

export function RoundsEditor({
  control,
  register,
  errors,
  locked,
}: {
  control: Control<DriveFormShape, unknown, DriveFormOutput>;
  register: UseFormRegister<DriveFormShape>;
  errors: FieldErrors<DriveFormShape>;
  locked: boolean;
}) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "rounds",
  });
  const listError =
    (
      errors.rounds as
        { message?: string; root?: { message?: string } } | undefined
    )?.root?.message ??
    (errors.rounds as { message?: string } | undefined)?.message;

  return (
    <section className="rounded-lg border border-border-default bg-surface-raised p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title">Interview rounds</h2>
        <span className="text-small text-fg-secondary">
          {fields.length} {fields.length === 1 ? "round" : "rounds"}
        </span>
      </div>
      <p className="mt-1 text-small text-fg-secondary">
        Candidates move through these in order. Approving in the last round
        marks them Selected.
      </p>
      {locked && (
        <p className="mt-3 flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-2 text-small">
          <Lock aria-hidden className="size-4 text-fg-secondary" />
          Rounds are locked once candidates have applied. You can still rename
          them.
        </p>
      )}
      <ol className="mt-4 flex flex-col gap-2">
        {fields.map((f, i) => {
          const err = (errors.rounds as RoundError[] | undefined)?.[i];
          const message = err?.name?.message ?? err?.message;
          return (
            <li
              key={f.id}
              className="rounded-md border border-border-default bg-surface-canvas p-2"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-small text-fg-secondary">
                  {i + 1}
                </span>
                <input
                  aria-label={`Round ${i + 1} name`}
                  aria-invalid={message ? true : undefined}
                  className={cn(
                    "h-10 min-w-0 flex-1 rounded-md border border-border-strong bg-surface-raised px-3 text-body",
                    "focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none",
                    "aria-invalid:border-border-danger",
                  )}
                  {...register(`rounds.${i}.name`)}
                />
                {!locked && (
                  <div className="flex">
                    <IconButton
                      label={`Move round ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton
                      label={`Move round ${i + 1} down`}
                      disabled={i === fields.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton
                      label={`Remove round ${i + 1}`}
                      disabled={fields.length === 1}
                      onClick={() => remove(i)}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </div>
                )}
              </div>
              {message && (
                <div className="mt-1 pl-8">
                  <FieldError>{message}</FieldError>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {listError && (
        <div className="mt-2">
          <FieldError>{listError}</FieldError>
        </div>
      )}
      {!locked && fields.length < MAX_ROUNDS && (
        <button
          type="button"
          onClick={() => append({ name: "" }, { shouldFocus: true })}
          className="mt-3 inline-flex items-center gap-2 rounded-md px-3 py-2 text-label hover:bg-surface-sunken"
        >
          <Plus aria-hidden className="size-4" /> Add round
        </button>
      )}
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-2 text-fg-secondary hover:bg-surface-sunken hover:text-fg-primary disabled:opacity-30"
    >
      {children}
    </button>
  );
}
