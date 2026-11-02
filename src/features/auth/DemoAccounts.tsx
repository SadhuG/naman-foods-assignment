import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../../components/ui/Brand";
import { cn } from "../../components/ui/cn";
import { FieldError } from "../../components/ui/Field";
import { Spinner } from "../../components/ui/Spinner";
import { friendlyError } from "../../lib/api/errors";
import { DEMO_ACCOUNTS, type DemoAccount } from "../../lib/demo";

/** One button per demo account; a tap signs in. Used on the login and landing pages. */
export function DemoAccountList({
  onSignIn,
  className,
}: {
  onSignIn: (account: DemoAccount) => Promise<void>;
  className?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(a: DemoAccount) {
    setBusy(a.email);
    setError(null);
    try {
      await onSignIn(a);
    } catch (e) {
      setError(friendlyError(e));
      setBusy(null);
    }
  }

  return (
    <div className={className}>
      <ul className="flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button
              onClick={() => go(a)}
              disabled={busy !== null}
              className="flex w-full items-center gap-3 rounded-md border border-border-default bg-surface-raised px-3 py-2.5 text-left hover:border-border-strong hover:bg-surface-hover disabled:opacity-60"
            >
              <Avatar name={a.name} dark={a.role === "hr"} />
              <span className="min-w-0 flex-1">
                <span className="block text-label">{a.name}</span>
                <span className="block truncate text-small text-fg-secondary">
                  {a.label}
                </span>
              </span>
              {busy === a.email ? (
                <Spinner className="text-fg-secondary" />
              ) : (
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 text-fg-secondary"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <div className="mt-2">
          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  );
}

/** "Try the demo" box on the login page. Uses VITE_DEMO_PASSWORD, else the built-in demo password. */
export function DemoAccounts({
  password,
  onSignIn,
  className,
}: {
  password: string;
  onSignIn: (account: DemoAccount) => Promise<void>;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="demo-title"
      className={cn(
        "rounded-lg border border-accent-soft-strong bg-surface-brand p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="demo-title" className="text-title">
          Try the demo
        </h2>
        <p className="font-mono text-small text-fg-secondary">
          Password: {password}
        </p>
      </div>
      <p className="mt-1 text-small text-fg-secondary">
        One tap logs you in. Demo accounts reset when the demo data is reseeded.
      </p>
      <DemoAccountList onSignIn={onSignIn} className="mt-3" />
    </section>
  );
}
