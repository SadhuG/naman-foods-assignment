import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { Button, buttonClass } from "../../components/ui/Button";
import { cn } from "../../components/ui/cn";
import { PageSpinner } from "../../components/ui/Spinner";
import { signIn, useAuth } from "../../lib/api/auth";
import { friendlyError } from "../../lib/api/errors";
import { DEMO_ACCOUNTS, type DemoAccount } from "../../lib/demo";
import {
  DEMO_DRIVE,
  DEMO_FUNNEL,
  DEMO_JOINED,
  joinedSentence,
} from "../../lib/landing";
import { env } from "../../lib/supabase";
import { DemoAccountList } from "../auth/DemoAccounts";
import { homeFor } from "../auth/RequireRole";
import { FunnelChart } from "./FunnelChart";
import { pageX, PublicLink, PublicShell } from "./PublicChrome";

const STEPS: Array<[title: string, body: string, stat: string]> = [
  [
    "Share one link",
    "Post the apply link or print the QR code for the plant gate. Each person creates an account and applies in one form.",
    `${DEMO_FUNNEL[0]!.count} applied`,
  ],
  [
    "Decide in batches",
    "Tick twenty people and approve, hold or reject them together. Add a private note and a message they’ll read. Anyone who can’t move is skipped and listed.",
    `${DEMO_FUNNEL.slice(1, 4)
      .map((s) => s.count)
      .join(", ")} moved on`,
  ],
  [
    "Collect joining details",
    "Selected people enter their Aadhaar, PAN, bank and emergency contact. HR checks them, asks for changes, or marks them as joined.",
    `${DEMO_FUNNEL.at(-1)!.count} selected`,
  ],
  [
    "Export at any stage",
    "Download one round, the full report, or every message sent, as a CSV that opens cleanly in Excel.",
    "Any stage, any time",
  ],
];

const sectionTitle = "text-section-mobile lg:text-section";
const sectionIntro = "mt-3 max-w-160 text-body-lg text-fg-secondary";

export default function LandingPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  async function signInAs(a: DemoAccount) {
    const role = await signIn(a.email, env.demoPassword!);
    navigate(homeFor(role), { replace: true });
  }

  if (auth.loading) return <PageSpinner />;
  // Signed-in people go straight to their own home.
  if (auth.session && auth.role)
    return <Navigate to={homeFor(auth.role)} replace />;

  const selected = DEMO_FUNNEL.at(-1)!.count;
  return (
    <PublicShell
      footerLink={
        <PublicLink to="/notes">Read the submission notes</PublicLink>
      }
    >
      {/* Hero: the demo drive's funnel is the picture. */}
      <section
        className={cn(
          pageX,
          "grid items-center gap-12 pt-8 pb-14 lg:grid-cols-[minmax(0,700px)_minmax(0,500px)] lg:gap-20 lg:pt-18 lg:pb-24",
        )}
      >
        <div className="flex flex-col gap-5 lg:gap-7">
          <h1 className="text-hero-mobile lg:text-hero">
            {DEMO_FUNNEL[0]!.count} applied.
            <br />
            {selected} selected.
            <br />
            Every step <br className="lg:hidden" />
            on record.
          </h1>
          <p className="max-w-150 text-lead-mobile text-fg-secondary lg:text-lead">
            Shortlist is Naman Foods’ tool for walk-in hiring drives. Candidates
            apply from a link on their phone, HR moves them through each round
            in batches, and everyone hears what happened.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <HrDemoButton onSignIn={signInAs} />
            <Link
              to={`/apply/${DEMO_DRIVE.slug}`}
              className={cn(buttonClass("secondary"), "w-full sm:w-auto")}
            >
              Apply as a candidate
            </Link>
          </div>
          <p className="text-small text-fg-secondary">
            Demo accounts, so no sign-up needed. No real emails or texts are
            sent.
          </p>
        </div>

        <figure className="flex flex-col gap-5 lg:gap-7">
          <figcaption>
            <span className="block text-title">{DEMO_DRIVE.title}</span>
            <span className="block text-small text-fg-secondary">
              {DEMO_DRIVE.summary}
            </span>
          </figcaption>
          <FunnelChart stages={DEMO_FUNNEL} />
          <p className="text-small text-fg-secondary">
            This is the demo drive you can open as HR.{" "}
            {joinedSentence(DEMO_JOINED, selected)}
          </p>
        </figure>
      </section>

      <section
        aria-labelledby="how-title"
        className="bg-surface-raised py-14 lg:pt-20 lg:pb-24"
      >
        <div className={pageX}>
          <h2 id="how-title" className={sectionTitle}>
            How a drive runs
          </h2>
          <p className={sectionIntro}>
            Four steps, from the first application to the joining date. Each one
            sends the candidate an email and a text, shown in the app as a demo.
          </p>
          <ol className="mt-7 grid gap-7 lg:mt-10 lg:grid-cols-4 lg:gap-8">
            {STEPS.map(([title, body, stat], i) => (
              <li
                key={title}
                className="flex flex-col gap-3 border-t-2 border-border-strong pt-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-title text-fg-link">{i + 1}</span>
                  <span className="text-small text-fg-secondary">{stat}</span>
                </div>
                <h3 className="text-heading">{title}</h3>
                <p className="text-body-lg text-fg-secondary">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="sides-title" className="py-14 lg:py-24">
        <div className={pageX}>
          <h2 id="sides-title" className={sectionTitle}>
            Both sides of every decision
          </h2>
          <p className={sectionIntro}>
            HR works on a whole round at once. Each candidate sees only their
            own application and the messages sent to them.
          </p>
          <div className="mt-7 flex flex-col gap-9 lg:mt-10 lg:flex-row lg:items-start lg:gap-10">
            <figure className="min-w-0 flex-1">
              <div className="h-75 overflow-hidden rounded-xl border border-border-default bg-surface-raised lg:h-140">
                <img
                  src="/landing/hr-pipeline.webp"
                  alt="The HR pipeline for the Walk-in drive, on the Technical Interview tab, with three candidates ticked."
                  width={1440}
                  height={1024}
                  loading="lazy"
                  className="block h-auto w-144 max-w-none lg:w-full"
                />
              </div>
              <figcaption className="mt-4 text-small text-fg-secondary">
                HR: the Technical Interview round, with three people ticked and
                ready to approve.
              </figcaption>
            </figure>
            <figure className="flex flex-col items-center lg:w-80 lg:items-stretch">
              <div className="h-135 w-75 overflow-hidden rounded-[28px] border-6 border-border-strong bg-surface-raised lg:h-140 lg:w-80">
                <img
                  src="/landing/candidate-email.webp"
                  alt="Aarav's inbox on a phone, showing the email “You're through to the Technical Interview”, marked as a demo."
                  width={390}
                  height={1146}
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </div>
              <figcaption className="mt-4 self-stretch text-small text-fg-secondary">
                Candidate: the email Aarav got when he moved to the Technical
                Interview.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {env.demoPassword && (
        <section
          aria-labelledby="demo-title"
          className="bg-surface-brand py-14 lg:py-20"
        >
          <div
            className={cn(
              pageX,
              "grid gap-7 lg:grid-cols-[480px_minmax(0,1fr)] lg:items-center lg:gap-20",
            )}
          >
            <div>
              <h2 id="demo-title" className={sectionTitle}>
                Try it with a demo account
              </h2>
              <p className="mt-3 text-body-lg text-fg-secondary">
                One HR account and two candidates at different stages. They all
                use the password{" "}
                <span className="text-fg-primary">{env.demoPassword}</span>, and
                the demo data resets on every reseed.
              </p>
            </div>
            <DemoAccountList onSignIn={signInAs} />
          </div>
        </section>
      )}
    </PublicShell>
  );
}

/** Signs straight in as the demo HR account when the demo is enabled; otherwise goes to log in. */
function HrDemoButton({
  onSignIn,
}: {
  onSignIn: (a: DemoAccount) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const hr = DEMO_ACCOUNTS.find((a) => a.role === "hr")!;
  if (!env.demoPassword)
    return (
      <Link to="/login" className={cn(buttonClass(), "w-full sm:w-auto")}>
        Sign in to try it
      </Link>
    );
  return (
    <Button
      loading={busy}
      className="w-full sm:w-auto"
      onClick={async () => {
        setBusy(true);
        try {
          await onSignIn(hr);
        } catch (e) {
          toast.error(friendlyError(e));
          setBusy(false);
        }
      }}
    >
      Try the HR demo
    </Button>
  );
}
