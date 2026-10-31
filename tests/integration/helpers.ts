import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

// Integration tests run against the live project. Credentials live in .env.local
// (never committed); Node 21+ can load it directly.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local: the suites skip themselves
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasDb = Boolean(url && anonKey && serviceKey);

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export function rand(n = 6): string {
  return randomBytes(n).toString("hex");
}

export function admin(): SupabaseClient {
  return createClient(url, serviceKey, noSession);
}

export function anon(): SupabaseClient {
  return createClient(url, anonKey, noSession);
}

async function signedIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, noSession);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function createUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

export async function newCandidate(): Promise<{
  client: SupabaseClient;
  email: string;
  userId: string;
}> {
  const email = `test+${rand()}@example.com`;
  const password = `pw-${rand(12)}`;
  const userId = await createUser(email, password);
  return { client: await signedIn(email, password), email, userId };
}

export async function hr(): Promise<SupabaseClient> {
  const email = `test+hr-${rand()}@example.com`;
  const password = `pw-${rand(12)}`;
  const userId = await createUser(email, password);
  const { error } = await admin().from("hr_users").insert({ user_id: userId });
  if (error) throw error;
  return signedIn(email, password);
}

export const ROUND_NAMES = ["Screening", "Aptitude Test", "Technical Interview", "HR Interview"];

export async function makeDrive(
  opts: { rounds?: number; status?: "open" | "closed" } = {},
): Promise<{ id: string; slug: string }> {
  const slug = `test-${rand()}`;
  const db = admin();
  const { data, error } = await db
    .from("drives")
    .insert({
      slug,
      title: `Test drive ${slug}`,
      role: "Tester",
      location: "Bhiwadi",
      openings: 3,
      description: "Integration test drive",
      status: opts.status ?? "open",
    })
    .select("id")
    .single();
  if (error) throw error;
  const rounds = ROUND_NAMES.slice(0, opts.rounds ?? 3).map((name, i) => ({
    drive_id: data.id,
    position: i + 1,
    name,
  }));
  const r = await db.from("drive_rounds").insert(rounds);
  if (r.error) throw r.error;
  return { id: data.id, slug };
}

export const PROFILE = {
  p_full_name: "Test Candidate",
  p_phone: "9811022345",
  p_city: "Jaipur",
  p_qualification: "B.Sc Food Technology",
  p_experience_years: 2,
};

/** Apply as `client` and return the candidate id (throws on error). */
export async function apply(client: SupabaseClient, slug: string): Promise<string> {
  const { data, error } = await client.rpc("apply_to_drive", { p_slug: slug, ...PROFILE });
  if (error) throw error;
  return data as string;
}

export async function setStatus(
  candidateId: string,
  patch: { status?: string; current_round?: number },
): Promise<void> {
  const { error } = await admin().from("candidates").update(patch).eq("id", candidateId);
  if (error) throw error;
}

export async function messagesFor(candidateId: string) {
  const { data, error } = await admin()
    .from("messages")
    .select("template, params, created_at")
    .eq("candidate_id", candidateId)
    .order("created_at");
  if (error) throw error;
  return data;
}

export const VALID_DETAILS = {
  date_of_birth: "2001-03-14",
  aadhaar_number: "234567890123",
  pan_number: "ABCDE1234F",
  uan_number: null,
  bank_account_holder: "Test Candidate",
  bank_account_number: "50100234567812",
  bank_ifsc: "HDFC0001234",
  address: "House 22, Shastri Nagar, Jaipur 302016",
  emergency_contact_name: "Parent",
  emergency_contact_phone: "9414055678",
  preferred_joining_date: "2026-11-17",
};

/** Delete every test drive (cascades to candidates, decisions, messages) and test user. */
export async function cleanup(): Promise<void> {
  const db = admin();
  await db.from("drives").delete().like("slug", "test-%");
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const victims = data.users.filter(
      (u) => u.email?.startsWith("test+") && u.email.endsWith("@example.com"),
    );
    for (const u of victims) await db.auth.admin.deleteUser(u.id);
    if (data.users.length < 1000) break;
  }
}
