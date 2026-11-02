import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Wordmark } from "../../components/ui/Brand";
import { Button } from "../../components/ui/Button";
import { Field, FieldError, Input } from "../../components/ui/Field";
import { PageSpinner } from "../../components/ui/Spinner";
import { signIn, useAuth, type Role } from "../../lib/api/auth";
import { friendlyError } from "../../lib/api/errors";
import { env } from "../../lib/supabase";
import { z } from "zod";
import { DemoAccounts } from "./DemoAccounts";
import { homeFor, safeNext } from "./RequireRole";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email address."),
  password: z.string().min(1, "Enter your password."),
});
type LoginInput = z.infer<typeof loginSchema>;

const STATS: Array<[string, string]> = [
  ["4", "rounds, one place"],
  ["1", "login for HR and candidates"],
  ["0", "documents to upload"],
];

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const destination = (role: Role) => {
    // A candidate can be sent back to an apply or application link; HR always lands on drives
    // unless the link was an HR page.
    if (next && (role === "hr") === !/^\/(me|apply)\b/.test(next)) return next;
    return homeFor(role);
  };

  async function go(email: string, password: string) {
    setError(null);
    const role = await signIn(email, password);
    navigate(destination(role), { replace: true });
  }

  if (auth.loading && !form.formState.isSubmitting) return <PageSpinner />;
  if (auth.session && auth.role && !form.formState.isSubmitting)
    return <Navigate to={destination(auth.role)} replace />;

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await go(v.email, v.password);
    } catch (e) {
      setError(friendlyError(e));
    }
  });

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-surface-brand p-16 lg:flex">
        <Wordmark to="/" />
        <div>
          <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.02em]">
            Hiring drives for Naman Foods.
          </h1>
          <p className="mt-3 max-w-130 text-body text-fg-secondary">
            Apply in about three minutes, then follow every round here. You get
            an email and an SMS each time something changes.
          </p>
        </div>
        <dl className="flex gap-12">
          {STATS.map(([n, label]) => (
            <div key={label} className="flex flex-col-reverse gap-2">
              <dt className="text-small text-fg-secondary">{label}</dt>
              <dd className="text-[32px] leading-none font-semibold text-accent-default">
                {n}
              </dd>
            </div>
          ))}
        </dl>
      </aside>

      <div className="flex flex-col">
        <header className="border-b border-border-default bg-surface-raised px-4 py-3 lg:hidden">
          <Wordmark to="/" />
        </header>
        <main className="mx-auto flex w-full max-w-100 flex-1 flex-col justify-center gap-6 px-4 py-8 lg:py-16">
          <div>
            <h1 className="text-display lg:text-[32px]">Log in</h1>
            <p className="mt-3 text-body text-fg-secondary">
              Candidates and the HR team use the same login.
            </p>
          </div>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <Field
              label="Email"
              hint="We'll never share it."
              error={form.formState.errors.email?.message}
            >
              <Input
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
            </Field>
            <Field
              label="Password"
              hint="At least 8 characters"
              error={form.formState.errors.password?.message}
            >
              <Input
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
            <Button
              type="submit"
              loading={form.formState.isSubmitting}
              className="w-full"
            >
              Log in
            </Button>
            <p className="text-small text-fg-secondary">
              New here?{" "}
              {next?.startsWith("/apply/") ? (
                <Link to={next} className="text-fg-link underline">
                  Create an account and apply.
                </Link>
              ) : (
                <span className="text-fg-link">
                  Apply through a drive link from Naman Foods.
                </span>
              )}
            </p>
          </form>
          {env.demoPassword && (
            <DemoAccounts
              password={env.demoPassword}
              onSignIn={(a) => go(a.email, env.demoPassword!)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
