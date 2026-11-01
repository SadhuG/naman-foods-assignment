// Server-side helpers for the browser tests: build drives, candidates and
// sessions straight in Supabase so each test starts from a known state.
// Everything a test creates uses the `test-` drive slug or a `test+` email,
// which the teardown (and the integration suite's cleanup) deletes.
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fall back to the real environment
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !anonKey || !serviceKey) {
  throw new Error(
    "e2e needs VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

export const BASE_URL = "http://localhost:5188";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "";
/** Where supabase-js keeps the session in localStorage. */
export const STORAGE_KEY = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin: SupabaseClient = createClient(url, serviceKey, noSession);

export const rand = (n = 4) => randomBytes(n).toString("hex");

function must<T>(
  res: { data: T; error: unknown },
  what: string,
): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${JSON.stringify(res.error)}`);
  return res.data as NonNullable<T>;
}

export const ROUNDS = [
  "Screening",
  "Aptitude Test",
  "Technical Interview",
  "HR Interview",
];

export type TestDrive = {
  id: string;
  slug: string;
  title: string;
  rounds: string[];
};

export async function createDrive(
  opts: { rounds?: string[]; status?: "open" | "closed"; title?: string } = {},
): Promise<TestDrive> {
  const slug = `test-e2e-${rand()}`;
  const rounds = opts.rounds ?? ROUNDS;
  const title = opts.title ?? `E2E drive ${slug.slice(-8)}`;
  const { id } = must(
    await admin
      .from("drives")
      .insert({
        slug,
        title,
        role: "Production Associate",
        location: "Bhiwadi, Rajasthan",
        openings: 5,
        description: "Browser test drive. Rotating shifts, PF and ESI.",
        status: opts.status ?? "open",
      })
      .select("id")
      .single(),
    "insert drive",
  );
  must(
    await admin
      .from("drive_rounds")
      .insert(
        rounds.map((name, i) => ({ drive_id: id, position: i + 1, name })),
      ),
    "insert rounds",
  );
  return { id, slug, title, rounds };
}

export type SeedCandidate = {
  full_name: string;
  email?: string;
  phone?: string;
  city?: string;
  qualification?: string;
  experience_years?: number;
  status?: string;
  current_round?: number;
};

let phoneSeq = 0;
function nextPhone(): string {
  phoneSeq = (phoneSeq + 1) % 1000;
  return `98${String(Date.now()).slice(-5)}${String(phoneSeq).padStart(3, "0")}`;
}

/** Inserts HR-added candidates (no account). Returns ids in input order. */
export async function addCandidates(
  driveId: string,
  people: SeedCandidate[],
): Promise<string[]> {
  const rows = must(
    await admin
      .from("candidates")
      .insert(
        people.map((p, i) => ({
          drive_id: driveId,
          user_id: null,
          full_name: p.full_name,
          email:
            p.email ??
            `${p.full_name.toLowerCase().replace(/[^a-z]+/g, ".")}.${rand(2)}${i}@example.com`,
          phone: p.phone ?? nextPhone(),
          city: p.city ?? "Alwar",
          qualification: p.qualification ?? "ITI — Fitter",
          experience_years: p.experience_years ?? 1,
          status: p.status ?? "active",
          current_round: p.current_round ?? 1,
        })),
      )
      .select("id, email"),
    "insert candidates",
  );
  return rows.map((r) => r.id);
}

export async function updateCandidate(
  id: string,
  patch: { status?: string; current_round?: number },
) {
  must(
    await admin.from("candidates").update(patch).eq("id", id),
    "update candidate",
  );
}

export async function candidateRow(id: string) {
  return must(
    await admin.from("candidates").select("*").eq("id", id).single(),
    "candidate row",
  );
}

export async function candidatesIn(driveId: string) {
  return must(
    await admin.from("candidates").select("*").eq("drive_id", driveId),
    "candidates in drive",
  );
}

export async function messagesFor(candidateId: string) {
  return must(
    await admin
      .from("messages")
      .select("template, params, created_at")
      .eq("candidate_id", candidateId)
      .order("created_at"),
    "messages",
  ) as Array<{ template: string; params: Record<string, string> }>;
}

export async function decisionsFor(candidateId: string) {
  return must(
    await admin
      .from("round_decisions")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("decided_at"),
    "decisions",
  );
}

export async function joiningFor(candidateId: string) {
  return must(
    await admin
      .from("joining_details")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle(),
    "joining details",
  );
}

export type TestUser = {
  email: string;
  password: string;
  userId: string;
  name: string;
};

export async function createUser(
  name = "Test Candidate",
  opts: { hr?: boolean } = {},
): Promise<TestUser> {
  const email = `test+e2e-${opts.hr ? "hr-" : ""}${rand()}@example.com`;
  const password = `pw-${rand(8)}`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (created.error) throw new Error(`create user: ${created.error.message}`);
  const user = created.data.user;
  if (opts.hr)
    must(await admin.from("hr_users").insert({ user_id: user.id }), "hr_users");
  return { email, password, userId: user.id, name };
}

/**
 * A signed-in session without the password endpoint, which Supabase limits to
 * about 30 calls per 5 minutes per IP. Magic-link verification has its own
 * budget; fall back to the password if it is unavailable.
 */
export async function sessionFor(u: TestUser): Promise<Session> {
  const client = createClient(url, anonKey, noSession);
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: u.email,
  });
  if (!link.error) {
    const v = await client.auth.verifyOtp({
      token_hash: link.data.properties.hashed_token,
      type: "email",
    });
    if (!v.error && v.data.session) return v.data.session;
  }
  const { data, error } = await client.auth.signInWithPassword({
    email: u.email,
    password: u.password,
  });
  if (error || !data.session)
    throw new Error(`session for ${u.email}: ${error?.message}`);
  return data.session;
}

/** A Supabase client acting as the session's user. */
export function clientFor(session: Session): SupabaseClient {
  return createClient(url, anonKey, {
    ...noSession,
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

/** Playwright storage state that starts the browser signed in. */
export function storageFor(session: Session) {
  return {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [{ name: STORAGE_KEY, value: JSON.stringify(session) }],
      },
    ],
  };
}

export const PROFILE = {
  p_full_name: "Test Candidate",
  p_phone: "9811022345",
  p_city: "Jaipur",
  p_qualification: "B.Sc Food Technology",
  p_experience_years: 2,
};

export async function applyAs(
  session: Session,
  slug: string,
  profile: Partial<typeof PROFILE> = {},
): Promise<string> {
  const { data, error } = await clientFor(session).rpc("apply_to_drive", {
    p_slug: slug,
    ...PROFILE,
    ...profile,
  });
  if (error) throw new Error(`apply: ${error.message}`);
  return data as string;
}

/** Local YYYY-MM-DD, `days` from today. */
export function isoDay(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Deletes every test drive (cascading to candidates) and test account. */
export async function cleanup(): Promise<void> {
  await admin.from("drives").delete().like("slug", "test-%");
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const victims = data.users.filter(
      (u) => u.email?.startsWith("test+") && u.email.endsWith("@example.com"),
    );
    for (const u of victims) await admin.auth.admin.deleteUser(u.id);
    if (data.users.length < 1000) break;
  }
}
