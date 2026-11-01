import { ChevronDown, CircleX } from "lucide-react";
import {
  cloneElement,
  isValidElement,
  useId,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "./cn";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1 text-small text-danger-default"
    >
      <CircleX aria-hidden className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}

/** Label + control + hint or error. Wires up id, aria-invalid and aria-describedby. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactElement<ControlProps>;
  className?: string;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": hint || error ? noteId : undefined,
      })
    : children;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label text-fg-primary">
        {label}
      </label>
      {control}
      {error ? (
        <FieldError id={noteId}>{error}</FieldError>
      ) : hint ? (
        <p id={noteId} className="text-small text-fg-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-md border border-border-strong bg-surface-raised px-3 text-body text-fg-primary placeholder:text-fg-disabled " +
  "focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus " +
  "aria-invalid:border-border-danger aria-invalid:focus:ring-border-danger disabled:bg-surface-sunken disabled:text-fg-disabled";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11 sm:h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-22 py-2", className)} {...rest} />
  );
}

export function Select({
  className,
  children,
  ...rest
}: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(control, "h-11 appearance-none pr-9 sm:h-10", className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-secondary"
      />
    </div>
  );
}

export function Checkbox({
  label,
  error,
  className,
  ...rest
}: ComponentProps<"input"> & { label: ReactNode; error?: string }) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className="flex items-start gap-2 text-small text-fg-secondary"
      >
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-4 shrink-0 accent-accent-default"
          {...rest}
        />
        <span>{label}</span>
      </label>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
