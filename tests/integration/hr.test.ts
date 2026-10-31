import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  apply,
  cleanup,
  hasDb,
  hr,
  makeDrive,
  messagesFor,
  newCandidate,
  setStatus,
  VALID_DETAILS,
} from "./helpers";

async function candidateIn(slug: string) {
  const me = await newCandidate();
  const id = await apply(me.client, slug);
  return { ...me, id };
}

async function state(id: string) {
  const { data, error } = await admin()
    .from("candidates")
    .select("status, current_round")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

describe.skipIf(!hasDb)("hr functions", () => {
  let H: SupabaseClient;
  beforeAll(async () => {
    H = await hr();
  });
  afterAll(cleanup);

  async function decide(
    ids: string[],
    decision: string,
    note?: string,
    message?: string,
  ) {
    const { data, error } = await H.rpc("hr_decide", {
      p_candidate_ids: ids,
      p_decision: decision,
      p_note: note ?? null,
      p_candidate_message: message ?? null,
    });
    if (error) throw error;
    return data as { moved: number; skipped: number };
  }

  it("approve at round 1 of 3 → active, round 2; message moved_to_round with next_round_name", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const c = await candidateIn(drive.slug);
    expect(
      await decide([c.id], "approved", undefined, "See you Thursday"),
    ).toEqual({
      moved: 1,
      skipped: 0,
    });
    expect(await state(c.id)).toEqual({ status: "active", current_round: 2 });
    const last = (await messagesFor(c.id)).at(-1)!;
    expect(last.template).toBe("moved_to_round");
    expect(last.params).toMatchObject({
      round_name: "Screening",
      next_round_name: "Aptitude Test",
      hr_message: "See you Thursday",
    });
    const { data: dec } = await admin()
      .from("round_decisions")
      .select("*")
      .eq("candidate_id", c.id);
    expect(dec).toHaveLength(1);
    expect(dec![0]).toMatchObject({
      round_position: 1,
      round_name: "Screening",
      decision: "approved",
    });
  });

  it("approve at the last round → selected; message selected", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const c = await candidateIn(drive.slug);
    await setStatus(c.id, { current_round: 3 });
    await decide([c.id], "approved");
    expect(await state(c.id)).toEqual({ status: "selected", current_round: 3 });
    expect((await messagesFor(c.id)).at(-1)!.template).toBe("selected");
  });

  it("hold → on_hold; approve from on_hold → next round", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const c = await candidateIn(drive.slug);
    await decide([c.id], "on_hold");
    expect(await state(c.id)).toEqual({ status: "on_hold", current_round: 1 });
    expect((await messagesFor(c.id)).at(-1)!.template).toBe("on_hold");
    await decide([c.id], "approved");
    expect(await state(c.id)).toEqual({ status: "active", current_round: 2 });
  });

  it("reject → rejected; reopened → active, same round", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const c = await candidateIn(drive.slug);
    await setStatus(c.id, { current_round: 2 });
    await decide([c.id], "rejected");
    expect(await state(c.id)).toEqual({ status: "rejected", current_round: 2 });
    await decide([c.id], "reopened");
    expect(await state(c.id)).toEqual({ status: "active", current_round: 2 });
    expect((await messagesFor(c.id)).map((m) => m.template).slice(-2)).toEqual([
      "rejected",
      "reopened",
    ]);
  });

  it("bulk approve [active, rejected, selected] → {moved: 1, skipped: 2}, exactly 1 new message", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const a = await candidateIn(drive.slug);
    const r = await candidateIn(drive.slug);
    const s = await candidateIn(drive.slug);
    await setStatus(r.id, { status: "rejected" });
    await setStatus(s.id, { status: "selected", current_round: 3 });
    const before = (
      await Promise.all([a, r, s].map((x) => messagesFor(x.id)))
    ).flat().length;
    expect(await decide([a.id, r.id, s.id], "approved")).toEqual({
      moved: 1,
      skipped: 2,
    });
    const after = (
      await Promise.all([a, r, s].map((x) => messagesFor(x.id)))
    ).flat().length;
    expect(after - before).toBe(1);
    expect(await state(r.id)).toEqual({ status: "rejected", current_round: 1 });
    expect(await state(s.id)).toEqual({ status: "selected", current_round: 3 });
  });

  it("p_note never appears in messages.params", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const c = await candidateIn(drive.slug);
    const note = `internal-only-${Date.now()}`;
    await decide([c.id], "approved", note, "Public message");
    const text = JSON.stringify(await messagesFor(c.id));
    expect(text).not.toContain(note);
    expect(text).toContain("Public message");
  });

  it('candidate account calling hr_decide → "not_hr"', async () => {
    const drive = await makeDrive();
    const c = await candidateIn(drive.slug);
    const { error } = await c.client.rpc("hr_decide", {
      p_candidate_ids: [c.id],
      p_decision: "approved",
    });
    expect(error?.message).toBe("not_hr");
    expect(await state(c.id)).toEqual({ status: "active", current_round: 1 });
  });

  it('hr_request_changes on selected → "not_ready"; on details_submitted → selected + changes_requested with reason', async () => {
    const drive = await makeDrive({ rounds: 3 });
    const c = await candidateIn(drive.slug);
    await setStatus(c.id, { status: "selected", current_round: 3 });
    const early = await H.rpc("hr_request_changes", {
      p_candidate_id: c.id,
      p_reason: "x",
    });
    expect(early.error?.message).toBe("not_ready");

    const sub = await c.client.rpc("submit_joining_details", {
      p_candidate_id: c.id,
      p_details: VALID_DETAILS,
    });
    expect(sub.error).toBeNull();
    const reason = "IFSC belongs to another branch";
    const { error } = await H.rpc("hr_request_changes", {
      p_candidate_id: c.id,
      p_reason: reason,
    });
    expect(error).toBeNull();
    expect((await state(c.id)).status).toBe("selected");
    const last = (await messagesFor(c.id)).at(-1)!;
    expect(last.template).toBe("changes_requested");
    expect(last.params).toMatchObject({ reason });
    const { data: jd } = await admin()
      .from("joining_details")
      .select("changes_requested_reason")
      .eq("candidate_id", c.id)
      .single();
    expect(jd!.changes_requested_reason).toBe(reason);
  });

  it("hr_mark_onboarded on details_submitted → onboarded with joining_date; otherwise not_ready", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const c = await candidateIn(drive.slug);
    const early = await H.rpc("hr_mark_onboarded", { p_candidate_id: c.id });
    expect(early.error?.message).toBe("not_ready");
    await setStatus(c.id, { status: "selected", current_round: 3 });
    await c.client.rpc("submit_joining_details", {
      p_candidate_id: c.id,
      p_details: VALID_DETAILS,
    });
    const { error } = await H.rpc("hr_mark_onboarded", {
      p_candidate_id: c.id,
    });
    expect(error).toBeNull();
    expect((await state(c.id)).status).toBe("onboarded");
    const last = (await messagesFor(c.id)).at(-1)!;
    expect(last.template).toBe("onboarded");
    expect(last.params).toMatchObject({
      joining_date: VALID_DETAILS.preferred_joining_date,
    });
  });

  it("HR sees every candidate in a drive and the drive_summary counts", async () => {
    const drive = await makeDrive({ rounds: 3 });
    const a = await candidateIn(drive.slug);
    await candidateIn(drive.slug);
    await decide([a.id], "on_hold");
    const { data: rows } = await H.from("candidates")
      .select("id")
      .eq("drive_id", drive.id);
    expect(rows).toHaveLength(2);
    const { data: sum } = await H.from("drive_summary")
      .select("*")
      .eq("drive_id", drive.id)
      .single();
    expect(sum).toMatchObject({ active: 1, on_hold: 1, total: 2 });
  });
});
