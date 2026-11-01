# Shortlist by Naman Foods

Shortlist is a bulk-hiring tool for Naman Foods' HR team. Candidates apply to a hiring drive from a link or QR code on their phone. HR moves them through the interview rounds in batches (approve, hold or reject, with a private note and an optional message to the candidate). Selected candidates then share their joining details (ID numbers, bank and emergency contact; no uploads). Every step produces the email and SMS the candidate would receive, shown inside the app as a demo. HR can export CSV at every stage.

**Live app:** _add the Vercel URL here after the first deploy_

## Demo accounts

All three share the password **`Shortlist#2026`**. The login page also has one-tap buttons for each.

| Account                  | Who         | Starts as                                             |
| ------------------------ | ----------- | ----------------------------------------------------- |
| `demo.hr@example.com`    | HR team     | Sees both drives and all 59 candidates                |
| `demo.aarav@example.com` | Aarav Mehta | Walk-in drive, round 3 (Technical Interview)          |
| `demo.meera@example.com` | Meera Iyer  | Walk-in drive, selected, joining details not yet sent |

Demo data resets whenever `npm run seed` runs.

## Try it in 3 minutes

1. **Sign in as HR.** The Drives page shows each drive's funnel. Open **Walk-in drive: Production Associates**.
2. **Move a few candidates.** In the **1 · Screening** tab, tick three people and choose **Approve to Aptitude Test**. Add an internal note (HR only) and a message to the candidates, and watch the email preview update as you type. Confirm, and the toast reports how many moved.
3. **Open the Outbox** from the drive header. The newest messages are the three emails and SMS you just sent, plus every earlier one.
4. **Sign in as Aarav** (on a phone-sized window if you can). **My applications** shows him in round 3. **Inbox** shows each email and SMS he was sent.
5. **Sign in as Meera.** Her application says she's selected. Fill in the joining details: loosely typed IDs like `abcde1234f` or `2345 6789 0123` are accepted and cleaned up. Submit.
6. **Back as HR,** open the **Selected** tab, click Meera, check her details (IDs are masked until you reveal them), and choose **Mark onboarded**. You could also **Request changes** with a reason, which she sees as a banner.
7. **Export** with **Export CSV → Full report**. It opens cleanly in Excel and Google Sheets.

## What the brief asked for, and where it is

| Brief                                              | In the app                                                                                                                                                                                                                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate sign-ups                                 | Public apply page per drive (`/apply/<drive>`) with a share link and printable QR code. One form creates the account and the application. Applying twice is blocked.                                                                                                                      |
| Movement through interviews: approve, hold, reject | Pipeline per drive with a tab per round, plus Selected, Rejected and All. Bulk approve, hold, reject and reopen. Each decision records an HR-only note and an optional message to the candidate. Candidates who can't take a step are skipped and reported. New applications appear live. |
| Final data collection from selected candidates     | Joining details form (Aadhaar, PAN, UAN, bank account, IFSC, address, emergency contact, joining date) with Indian ID validation. HR reviews, requests changes or marks the candidate onboarded. No file uploads, by design.                                                              |
| CSV export at every stage                          | Export the current stage (with filters), selected rows, a full report (every round's decision plus joining details), a decision log and a message log. Files are Excel-safe: UTF-8 BOM, formula-injection guard, and ID numbers kept as text.                                             |
| Clarification: 20–50 candidates per drive          | Seeded with two drives: 47 candidates (open) and 12 (closed), with two weeks of history.                                                                                                                                                                                                  |
| Clarification: demo accounts                       | One HR account and two candidates at different stages, as above.                                                                                                                                                                                                                          |
| Clarification: mock emails and SMS                 | Nine message templates. Candidates read them in an Inbox, and HR sees every message per drive in an Outbox. Nothing is sent.                                                                                                                                                              |

## Privacy and safety

- Row Level Security on every table. Candidates can read only their own applications, joining details and messages. HR access comes only from the `hr_users` table.
- Every state change is a SQL function that checks who is calling and which transition is allowed, then writes the mock message in the same transaction.
- HR's internal notes never reach a candidate: they're excluded from the candidate's timeline and never copied into messages. Integration tests cover this.

## Tech stack

Vite, React 19, TypeScript (strict), React Router, TanStack Query, react-hook-form with zod, Tailwind CSS v4 (tokens from the Figma variables), Supabase (Postgres, Auth, Realtime), Vitest. Hosted on Vercel and Supabase.

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project's URL and anon key, the service-role key (server only), the database URL and a demo password. Quote values that contain `#`.
3. Apply the migrations: `npx supabase db push --db-url "$SUPABASE_DB_URL"`. In Supabase Auth settings, turn email confirmation off.
4. `npm run seed` creates the demo accounts and data. Run it again any time to reset.
5. `npm run dev`

Checks: `npm test` (unit), `npm run test:db` (integration tests against the database), `npm run test:e2e` (Playwright browser tests), `npx tsc -b`, `npx prettier --check .`

All tests live in `tests/`:

- `tests/unit/`: Vitest unit tests, mirroring `src/` and `scripts/`.
- `tests/integration/`: the SQL functions and privacy rules, against the Supabase project in `.env.local`.
- `tests/e2e/`: 60 browser tests on a 1440 px desktop and a 390 px phone, covering every flow plus double submits, dropped connections, two HR people deciding at once, 50-person bulk actions, CSV edge cases and accessibility (axe). Run `npx playwright install chromium` once. A run reseeds the demo data first (skip with `E2E_SKIP_SEED=1`) and deletes everything it creates. Supabase allows about 30 logins per 5 minutes from one machine, so leave about 5 minutes between runs of `test:db` and `test:e2e`.

## Next steps

- Send real emails and SMS through a provider such as SES or MSG91. The templates and the message log are already in place.
- Document uploads (ID scans, certificates) with Supabase Storage and virus scanning.
- Interview scheduling: slots, reminders and calendar invites.
- Several HR users with roles, and an audit view of who revealed which ID number.

## Design

All screens were designed first in Figma, with variables for colour, spacing and type: _add the Figma file link here_.
