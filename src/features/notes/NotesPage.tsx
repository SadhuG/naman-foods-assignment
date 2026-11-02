import type { ReactNode } from "react";
import { Link } from "react-router";
import { buttonClass } from "../../components/ui/Button";
import { cn } from "../../components/ui/cn";
import { DEMO_ACCOUNTS } from "../../lib/demo";
import { PLANNED_HOURS, REPO_URL } from "../../lib/landing";
import { env } from "../../lib/supabase";
import { pageX, PublicLink, PublicShell } from "../landing/PublicChrome";

const SECTIONS = [
  ["one-minute", "In one minute"],
  ["brief", "The brief, line by line"],
  ["hours", "Where the hours went"],
  ["decisions", "Decisions and trade-offs"],
  ["testing", "How it’s tested"],
  ["next", "What I’d do next"],
] as const;
type SectionId = (typeof SECTIONS)[number][0];
const title = (id: SectionId) => SECTIONS.find(([s]) => s === id)![1];

const BRIEF: Array<[string, string]> = [
  [
    "Candidate sign-ups",
    "A public apply page for each drive, with a share link and a printable QR code. One form creates the account and the application. Applying twice is blocked.",
  ],
  [
    "Approve, hold and reject through the interviews",
    "A tab for each round. Approve, hold, reject or reopen many people at once, each with an HR-only note and an optional message. People who can’t take that step are skipped and listed.",
  ],
  [
    "Joining details from selected candidates",
    "Aadhaar, PAN, UAN, bank account, IFSC, address, emergency contact and joining date, with Indian ID checks. HR reviews them, asks for changes or marks the person as joined.",
  ],
  [
    "CSV export at every stage",
    "The current stage with its filters, ticked rows, a full report, a decision log and a message log. Opens cleanly in Excel, can’t run formulas, and keeps ID numbers as text.",
  ],
  [
    "20 to 50 candidates per drive",
    "Two demo drives: 47 candidates (open) and 12 (closed), with two weeks of history.",
  ],
  ["Demo accounts", "One HR account and two candidates at different stages."],
  [
    "Mock emails and texts",
    "Nine message templates. Candidates read them in an Inbox; HR sees every one in a drive’s Outbox. Nothing is sent.",
  ],
];

const DECISIONS: Array<[string, string]> = [
  [
    "No file uploads",
    "The brief’s clarification asked for plain data only, so ID numbers are typed and checked, never scanned. It also means no stored documents to secure.",
  ],
  [
    "Emails and texts are shown, not sent",
    "Every step writes the message the candidate would get. They read it in their Inbox, marked as a demo. A real provider can plug in later without changing the templates.",
  ],
  [
    "Rules live in the database",
    "Each change, like approving someone, is one database function that checks who’s asking and whether the step is allowed. Candidates can only ever read their own rows.",
  ],
  [
    "HR notes stay private",
    "The HR-only note and the message to the candidate are separate fields. Notes never reach a candidate’s timeline or messages, and tests check this.",
  ],
  [
    "Batch first",
    "HR picks many people and decides once. People who can’t take that step are skipped and listed rather than failing the whole batch.",
  ],
];

const TESTS: Array<[string, string]> = [
  [
    "Unit tests",
    "ID number checks, CSV safety, message templates and the round rules, with Vitest.",
  ],
  [
    "Database tests",
    "Every database function and privacy rule, run against the real Supabase project.",
  ],
  [
    "Browser tests",
    "Every flow at desktop and phone sizes, plus double submits, dropped connections, two HR people deciding at once, 50-person batches and accessibility checks.",
  ],
];

const NEXT: Array<[string, string]> = [
  [
    "Real emails and texts",
    "Send through a provider such as Amazon SES or MSG91. The templates and the message log are already in place.",
  ],
  [
    "Document uploads",
    "ID scans and certificates, stored privately and checked for viruses.",
  ],
  [
    "Interview scheduling",
    "Slots, reminders and calendar invites for each round.",
  ],
  [
    "HR roles and an audit view",
    "Several HR people with different permissions, and a record of who revealed which ID number.",
  ],
];

const totalHours = PLANNED_HOURS.reduce((n, [, h]) => n + h, 0);
const maxHours = Math.max(...PLANNED_HOURS.map(([, h]) => h));

export default function NotesPage() {
  const emails = DEMO_ACCOUNTS.map((a) => a.email);
  return (
    <PublicShell
      footerLink={<PublicLink to="/">Back to the overview</PublicLink>}
    >
      <div
        className={cn(
          pageX,
          "pt-8 pb-18 lg:grid lg:grid-cols-[220px_minmax(0,720px)] lg:gap-24 lg:pt-16 lg:pb-30",
        )}
      >
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-8 flex flex-col gap-3">
            <p className="text-label text-fg-secondary">On this page</p>
            {SECTIONS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-body hover:text-fg-link hover:underline"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <article className="flex flex-col gap-14 lg:gap-18">
          <header className="flex flex-col gap-5">
            <p className="text-label text-fg-link">Submission notes</p>
            <h1 className="text-page-title-mobile lg:text-page-title">
              Shortlist: a bulk-hiring tool, built in 24&nbsp;hours
            </h1>
            <p className="text-body text-fg-secondary">
              Sudhansh, for the Naman Foods assignment, 1 November 2026
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Link
                to="/login"
                className={cn(buttonClass(), "w-full sm:w-auto")}
              >
                Open the app
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonClass("secondary"), "w-full sm:w-auto")}
              >
                View the code on GitHub
              </a>
            </div>
          </header>

          <Section id="one-minute">
            <p className="text-body-lg">
              Candidates apply to a hiring drive from a link or QR code on their
              phone. HR moves them through the interview rounds in batches:
              approve, hold or reject, with a private note and an optional
              message to the candidate. Selected people then send their joining
              details. Every step creates the email and text the candidate would
              get, shown in the app because nothing is really sent. HR can
              export CSV at every stage.
            </p>
            {env.demoPassword && (
              <p className="text-body-lg text-fg-secondary">
                To try it, sign in as {emails.slice(0, -1).join(", ")} or{" "}
                {emails.at(-1)}. The password for all three is{" "}
                <span className="text-fg-primary">{env.demoPassword}</span>.
              </p>
            )}
          </Section>

          <Section
            id="brief"
            intro="Each line of the brief, plus the clarifications from 31 October, and where you’ll find it in the app."
          >
            <Rows
              rows={BRIEF}
              wide
              aside={
                <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-status-selected-bg px-2.5 text-label whitespace-nowrap text-status-selected-fg">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-current"
                  />
                  Done
                </span>
              }
            />
          </Section>

          <Section
            id="hours"
            intro={`The plan gave each phase a time budget before any code was written: ${totalHours} hours across ${PLANNED_HOURS.length} phases. Design came first, in Figma, so the app is built from the same colours and type.`}
          >
            <table className="w-full border-separate border-spacing-y-1.5">
              <caption className="sr-only">Planned hours per phase</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Phase</th>
                  <th scope="col">Planned hours</th>
                </tr>
              </thead>
              <tbody>
                {PLANNED_HOURS.map(([phase, hours]) => (
                  <tr key={phase}>
                    <th
                      scope="row"
                      className="w-32.5 pr-2.5 text-left align-middle text-body font-normal sm:w-45 sm:pr-4"
                    >
                      {phase}
                    </th>
                    <td className="align-middle">
                      <div className="flex items-center gap-2.5 sm:gap-4">
                        <span
                          aria-hidden
                          className="h-5 rounded-[3px] bg-orange-400 sm:h-6"
                          style={{
                            width: `${(hours / maxHours) * 100 * 0.8}%`,
                          }}
                        />
                        <span className="shrink-0 text-label text-fg-secondary">
                          {hours} h
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-small text-fg-secondary">
              Planned hours, not a time log.
            </p>
          </Section>

          <Section
            id="decisions"
            intro="The calls that shaped the build, and why."
          >
            <Rows rows={DECISIONS} />
          </Section>
          <Section id="testing">
            <Rows rows={TESTS} />
          </Section>
          <Section id="next">
            <Rows rows={NEXT} />
          </Section>
        </article>
      </div>
    </PublicShell>
  );
}

function Section({
  id,
  intro,
  children,
}: {
  id: SectionId;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-8 flex-col gap-5"
    >
      <h2 id={`${id}-title`} className="text-doc-heading">
        {title(id)}
      </h2>
      {intro && <p className="text-body-lg text-fg-secondary">{intro}</p>}
      {children}
    </section>
  );
}

/** Title + description rows with a hairline above each; stacked on phones. */
function Rows({
  rows,
  aside,
  wide,
}: {
  rows: Array<[string, string]>;
  aside?: ReactNode;
  wide?: boolean;
}) {
  return (
    <dl>
      {rows.map(([term, desc]) => (
        <div
          key={term}
          className="flex flex-col gap-2 border-t border-border-default py-4 sm:flex-row sm:gap-6"
        >
          <dt className="text-title sm:w-50 sm:shrink-0">{term}</dt>
          <dd
            className={cn(
              "flex flex-col items-start gap-2 sm:flex-1 sm:flex-row sm:gap-6",
              wide ? "text-body" : "text-body-lg",
              "text-fg-secondary",
            )}
          >
            <span className="sm:flex-1">{desc}</span>
            {aside}
          </dd>
        </div>
      ))}
    </dl>
  );
}
