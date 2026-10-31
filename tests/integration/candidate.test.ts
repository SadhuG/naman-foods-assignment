import { afterAll, describe, expect, it } from "vitest";
import {
  admin,
  anon,
  apply,
  cleanup,
  hasDb,
  makeDrive,
  messagesFor,
  newCandidate,
  PROFILE,
  setStatus,
  VALID_DETAILS,
} from "./helpers";

describe.skipIf(!hasDb)("candidate functions", () => {
  afterAll(cleanup);

  it("apply returns an id; candidate row has the account's lower-cased email; one application_received message", async () => {
    const drive = await makeDrive();
    const me = await newCandidate();
    const id = await apply(me.client, drive.slug);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    const { data: row } = await admin().from("candidates").select("*").eq("id", id).single();
    expect(row.email).toBe(me.email.toLowerCase());
    expect(row.user_id).toBe(me.userId);
    expect(row.status).toBe("active");
    expect(row.current_round).toBe(1);

    const msgs = await messagesFor(id);
    expect(msgs.map((m) => m.template)).toEqual(["application_received"]);
    expect(msgs[0].params).toMatchObject({
      candidate_name: PROFILE.p_full_name,
      drive_title: `Test drive ${drive.slug}`,
      company: "Naman Foods",
    });
  });

  it('applying twice to the same drive → "already_applied" and no duplicate row', async () => {
    const drive = await makeDrive();
    const me = await newCandidate();
    await apply(me.client, drive.slug);
    const { error } = await me.client.rpc("apply_to_drive", { p_slug: drive.slug, ...PROFILE });
    expect(error?.message).toBe("already_applied");
    const { count } = await admin()
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("drive_id", drive.id);
    expect(count).toBe(1);
  });

  it('closed drive → "drive_closed"; unknown slug → "drive_not_found"', async () => {
    const closed = await makeDrive({ status: "closed" });
    const me = await newCandidate();
    const a = await me.client.rpc("apply_to_drive", { p_slug: closed.slug, ...PROFILE });
    expect(a.error?.message).toBe("drive_closed");
    const b = await me.client.rpc("apply_to_drive", { p_slug: "test-nope-nope", ...PROFILE });
    expect(b.error?.message).toBe("drive_not_found");
  });

  it("anon can read a public drive with its rounds, but gets null for unknown slugs", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const { data, error } = await anon().rpc("get_public_drive", { p_slug: drive.slug });
    expect(error).toBeNull();
    expect(data).toMatchObject({ status: "open", openings: 3 });
    expect(data.rounds.map((r: { name: string }) => r.name)).toEqual([
      "Screening",
      "Aptitude Test",
      "Technical Interview",
    ]);
    const none = await anon().rpc("get_public_drive", { p_slug: "test-nope-nope" });
    expect(none.data).toBeNull();
  });

  it("candidate A selecting from candidates sees only their own row", async () => {
    const drive = await makeDrive();
    const a = await newCandidate();
    const b = await newCandidate();
    const aId = await apply(a.client, drive.slug);
    await apply(b.client, drive.slug);
    const { data } = await a.client.from("candidates").select("id");
    expect(data?.map((r) => r.id)).toEqual([aId]);
  });

  it('candidate A calling get_my_application on B\'s id → "application_not_found"', async () => {
    const drive = await makeDrive();
    const a = await newCandidate();
    const b = await newCandidate();
    const bId = await apply(b.client, drive.slug);
    const { error } = await a.client.rpc("get_my_application", { p_candidate_id: bId });
    expect(error?.message).toBe("application_not_found");
  });

  it("candidate selecting from round_decisions returns 0 rows; timeline omits HR notes", async () => {
    const drive = await makeDrive();
    const me = await newCandidate();
    const id = await apply(me.client, drive.slug);
    const note = `secret-hr-note-${Date.now()}`;
    const ins = await admin().from("round_decisions").insert({
      candidate_id: id,
      round_position: 1,
      round_name: "Screening",
      decision: "approved",
      note,
      candidate_message: "Bring your resume",
    });
    expect(ins.error).toBeNull();

    const { data: rows } = await me.client.from("round_decisions").select("*");
    expect(rows).toEqual([]);

    const { data, error } = await me.client.rpc("get_my_application", { p_candidate_id: id });
    expect(error).toBeNull();
    const text = JSON.stringify(data);
    expect(text).not.toContain(note);
    expect(text).toContain("Bring your resume");
    expect(data.timeline).toHaveLength(1);
    expect(data.rounds).toHaveLength(3);
  });

  it("list_my_applications returns only the caller's applications with round names", async () => {
    const drive = await makeDrive();
    const me = await newCandidate();
    const other = await newCandidate();
    await apply(me.client, drive.slug);
    await apply(other.client, drive.slug);
    const { data, error } = await me.client.rpc("list_my_applications");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      status: "active",
      current_round: 1,
      current_round_name: "Screening",
      total_rounds: 3,
    });
  });

  it('submit_joining_details while active → "not_selected"', async () => {
    const drive = await makeDrive();
    const me = await newCandidate();
    const id = await apply(me.client, drive.slug);
    const { error } = await me.client.rpc("submit_joining_details", {
      p_candidate_id: id,
      p_details: VALID_DETAILS,
    });
    expect(error?.message).toBe("not_selected");
  });

  it("submit_joining_details when selected → details_submitted, details_received message, reason cleared", async () => {
    const drive = await makeDrive();
    const me = await newCandidate();
    const id = await apply(me.client, drive.slug);
    await setStatus(id, { status: "selected", current_round: 3 });
    const { error } = await me.client.rpc("submit_joining_details", {
      p_candidate_id: id,
      p_details: VALID_DETAILS,
    });
    expect(error).toBeNull();
    const { data: row } = await admin().from("candidates").select("status").eq("id", id).single();
    expect(row.status).toBe("details_submitted");
    const { data: jd } = await me.client.from("joining_details").select("*").eq("candidate_id", id);
    expect(jd?.[0]).toMatchObject({ pan_number: "ABCDE1234F", changes_requested_reason: null });
    expect((await messagesFor(id)).map((m) => m.template)).toContain("details_received");
  });

  it("anon calling apply_to_drive → error", async () => {
    const drive = await makeDrive();
    const { data, error } = await anon().rpc("apply_to_drive", { p_slug: drive.slug, ...PROFILE });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
