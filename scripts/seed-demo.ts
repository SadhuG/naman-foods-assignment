// npm run seed — resets the live project to the demo state. Safe to re-run:
// it deletes demo-* drives (cascading to their candidates) and reuses the
// three demo users. Needs SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD in .env.local.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS } from "../src/lib/demo";
import { buildDemoDataset, stepsFor, type DemoCandidate } from "./demo-data";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fall back to the real environment
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD?.trim() || DEFAULT_DEMO_PASSWORD;
if (!url || !anonKey || !serviceKey || !password) {
  throw new Error(
    "Missing SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY / DEMO_PASSWORD",
  );
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, noSession);
const DAY = 24 * 60 * 60 * 1000;

function must<T>(res: { data: T; error: unknown }, what: string): T {
  if (res.error) throw new Error(`${what}: ${JSON.stringify(res.error)}`);
  return res.data;
}

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, anonKey!, noSession);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: password!,
  });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return client;
}

async function upsertUsers(): Promise<Map<string, string>> {
  const existing = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { users } = must(
      await admin.auth.admin.listUsers({ page, perPage: 1000 }),
      "list users",
    );
    for (const u of users) if (u.email) existing.set(u.email, u.id);
    if (users.length < 1000) break;
  }
  const ids = new Map<string, string>();
  for (const acc of DEMO_ACCOUNTS) {
    let id = existing.get(acc.email);
    if (id) {
      must(
        await admin.auth.admin.updateUserById(id, {
          password,
          email_confirm: true,
        }),
        `update ${acc.email}`,
      );
    } else {
      const { user } = must(
        await admin.auth.admin.createUser({
          email: acc.email,
          password,
          email_confirm: true,
          user_metadata: { name: acc.name },
        }),
        `create ${acc.email}`,
      );
      id = user.id;
    }
    ids.set(acc.email, id);
  }
  const hrId = ids.get("demo.hr@example.com")!;
  must(await admin.from("hr_users").upsert({ user_id: hrId }), "hr_users");
  return ids;
}

/** Spread n timestamps from `daysAgo` towards now, oldest first. */
function timeline(daysAgo: number, n: number, salt: number): Date[] {
  const start = Date.now() - daysAgo * DAY + ((salt * 37) % 9) * 60 * 60 * 1000;
  const span = Math.max(daysAgo * DAY * 0.85, 2 * 60 * 60 * 1000);
  return Array.from(
    { length: n },
    (_, i) => new Date(start + (n > 1 ? (span * i) / (n - 1) : 0)),
  );
}

async function inChunks<T>(
  items: T[],
  size: number,
  fn: (x: T) => Promise<unknown>,
) {
  for (let i = 0; i < items.length; i += size)
    await Promise.all(items.slice(i, i + size).map(fn));
}

async function main() {
  const data = buildDemoDataset();
  console.log("1/6 demo users");
  await upsertUsers();

  console.log("2/6 drives");
  must(
    await admin.from("drives").delete().like("slug", "demo-%"),
    "delete demo drives",
  );
  const driveIds = new Map<string, string>();
  for (const d of data.drives) {
    const { id } = must(
      await admin
        .from("drives")
        .insert({
          slug: d.slug,
          title: d.title,
          role: d.role,
          location: d.location,
          openings: d.openings,
          description: d.description,
          // closed drives are opened briefly so demo candidates could apply; none do today
          status: d.status,
          created_at: new Date(Date.now() - 15 * DAY).toISOString(),
        })
        .select("id")
        .single(),
      `insert drive ${d.slug}`,
    );
    driveIds.set(d.slug, id);
    must(
      await admin
        .from("drive_rounds")
        .insert(
          d.rounds.map((name, i) => ({ drive_id: id, position: i + 1, name })),
        ),
      `rounds ${d.slug}`,
    );
  }

  console.log("3/6 applications");
  type Placed = {
    c: DemoCandidate;
    id: string;
    driveSlug: string;
    rounds: number;
  };
  const placed: Placed[] = [];
  for (const d of data.drives) {
    const driveId = driveIds.get(d.slug)!;
    const dummies = d.candidates.filter((c) => !c.account);
    const rows = must(
      await admin
        .from("candidates")
        .insert(
          dummies.map((c) => ({
            drive_id: driveId,
            user_id: null,
            full_name: c.full_name,
            email: c.email,
            phone: c.phone,
            city: c.city,
            qualification: c.qualification,
            experience_years: c.experience_years,
          })),
        )
        .select("id, email"),
      `candidates ${d.slug}`,
    );
    const byEmail = new Map(rows.map((r) => [r.email, r.id]));
    must(
      await admin.from("messages").insert(
        dummies.map((c) => ({
          candidate_id: byEmail.get(c.email)!,
          template: "application_received",
          params: {
            candidate_name: c.full_name,
            drive_title: d.title,
            company: "Naman Foods",
            round_name: d.rounds[0],
          },
        })),
      ),
      `application messages ${d.slug}`,
    );
    for (const c of d.candidates) {
      let id = byEmail.get(c.email);
      if (c.account) {
        // the real path: the demo candidate signs in and applies
        const client = await signIn(c.account);
        id = must(
          await client.rpc("apply_to_drive", {
            p_slug: d.slug,
            p_full_name: c.full_name,
            p_phone: c.phone,
            p_city: c.city,
            p_qualification: c.qualification,
            p_experience_years: c.experience_years,
          }),
          `apply ${c.account}`,
        ) as string;
      }
      placed.push({ c, id: id!, driveSlug: d.slug, rounds: d.rounds.length });
    }
  }

  console.log("4/6 hr decisions");
  const hr = await signIn("demo.hr@example.com");
  const maxSteps = Math.max(
    ...placed.map((p) => stepsFor(p.c, p.rounds).length),
  );
  let calls = 0;
  for (let k = 0; k < maxSteps; k++) {
    const groups = new Map<string, string[]>();
    for (const p of placed) {
      const step = stepsFor(p.c, p.rounds)[k];
      if (!step) continue;
      const key = JSON.stringify([
        step.decision,
        p.c.notes[k],
        p.c.candidate_messages[k],
      ]);
      groups.set(key, [...(groups.get(key) ?? []), p.id]);
    }
    for (const [key, ids] of groups) {
      const [decision, note, message] = JSON.parse(key) as [
        string,
        string,
        string | null,
      ];
      const res = must(
        await hr.rpc("hr_decide", {
          p_candidate_ids: ids,
          p_decision: decision,
          p_note: note,
          p_candidate_message: message,
        }),
        `hr_decide step ${k}`,
      ) as { moved: number; skipped: number };
      if (res.skipped)
        throw new Error(`step ${k} skipped ${res.skipped} candidates`);
      calls++;
    }
  }
  console.log(`   ${calls} hr_decide calls`);

  console.log("5/6 joining details");
  for (const p of placed.filter((x) => x.c.joining)) {
    const d = data.drives.find((x) => x.slug === p.driveSlug)!;
    must(
      await admin
        .from("joining_details")
        .insert({ candidate_id: p.id, ...p.c.joining! }),
      "joining details",
    );
    must(
      await admin
        .from("candidates")
        .update({ status: "details_submitted" })
        .eq("id", p.id),
      "details status",
    );
    must(
      await admin.from("messages").insert({
        candidate_id: p.id,
        template: "details_received",
        params: {
          candidate_name: p.c.full_name,
          drive_title: d.title,
          company: "Naman Foods",
          joining_date: p.c.joining!.preferred_joining_date,
        },
      }),
      "details message",
    );
    if (p.c.target.status === "onboarded") {
      must(
        await hr.rpc("hr_mark_onboarded", { p_candidate_id: p.id }),
        "onboard",
      );
    }
  }

  console.log("6/6 backdating to two weeks of activity");
  await inChunks(placed, 8, async (p) => {
    const salt = p.c.phone.charCodeAt(9);
    const decisions = must(
      await admin
        .from("round_decisions")
        .select("id")
        .eq("candidate_id", p.id)
        .order("decided_at")
        .order("id"),
      "decisions",
    );
    const messages = must(
      await admin
        .from("messages")
        .select("id, template")
        .eq("candidate_id", p.id)
        .order("created_at")
        .order("id"),
      "messages",
    );
    // application, each decision, then details/onboarding
    const times = timeline(p.c.days_ago, messages.length, salt);
    must(
      await admin
        .from("candidates")
        .update({ created_at: times[0].toISOString() })
        .eq("id", p.id),
      "backdate candidate",
    );
    for (const [i, m] of messages.entries()) {
      must(
        await admin
          .from("messages")
          .update({ created_at: times[i].toISOString() })
          .eq("id", m.id),
        "backdate message",
      );
    }
    for (const [i, dcs] of decisions.entries()) {
      must(
        await admin
          .from("round_decisions")
          .update({ decided_at: times[i + 1].toISOString() })
          .eq("id", dcs.id),
        "backdate decision",
      );
    }
    const received = messages.findIndex(
      (m) => m.template === "details_received",
    );
    if (received >= 0) {
      must(
        await admin
          .from("joining_details")
          .update({ submitted_at: times[received].toISOString() })
          .eq("candidate_id", p.id),
        "backdate details",
      );
    }
  });

  const summary = must(
    await admin.from("drive_summary").select("*"),
    "summary",
  );
  for (const d of data.drives) {
    const s = summary.find((x) => x.drive_id === driveIds.get(d.slug));
    console.log(
      `${d.slug}:`,
      JSON.stringify(s && { ...s, drive_id: undefined }),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
