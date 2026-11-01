import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "./cn";

export function Wordmark({
  to = "/",
  className,
}: {
  to?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn("inline-flex flex-col leading-none", className)}
      aria-label="Shortlist by Naman Foods, home"
    >
      <span className="text-[20px] font-semibold tracking-[-0.02em]">
        Shortlist
        <span
          aria-hidden
          className="ml-0.5 inline-block size-1.5 rounded-full bg-accent-brand"
        />
      </span>
      <span className="mt-1 text-small text-fg-secondary">by Naman Foods</span>
    </Link>
  );
}

/** "Aarav Mehta" → "AM"; a leading acronym wins: "HR team" → "HR". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (/^[A-Z]{2,3}$/.test(words[0] ?? "")) return words[0]!;
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  dark,
  className,
}: {
  name: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-label",
        dark
          ? "bg-surface-inverse text-fg-inverse"
          : "bg-accent-soft text-accent-default",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Mono overline like "NAMAN FOODS · BHIWADI". */
export function Overline({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-caption text-accent-default uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-default bg-surface-raised",
        className,
      )}
    >
      {children}
    </div>
  );
}
