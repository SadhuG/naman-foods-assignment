import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  apply,
  cleanup,
  hasDb,
  hr,
  newCandidate,
  rand,
} from "./helpers";

const input = (over: Record<string, unknown> = {}) => ({
  p_drive_id: null as string | null,
  p_slug: `test-${rand()}`,
  p_title: "Test drive",
  p_role: "Tester",
  p_location: "Bhiwadi",
  p_openings: 2,
  p_description: "",
  p_status: "open",
  p_rounds: ["Screening", "Lab Practical", "Panel Interview"],
  ...over,
});

async function roundNames(id: string) {
  const { data } = await admin()
    .from("drive_rounds")
    .select("name")
    .eq("drive_id", id)
    .order("position");
  return data!.map((r) => r.name);
}

describe.skipIf(!hasDb)("hr_save_drive", () => {
  let H: SupabaseClient;
  beforeAll(async () => {
    H = await hr();
  });
  afterAll(cleanup);

  it("creates a drive with its rounds in order", async () => {
    const { data: id, error } = await H.rpc("hr_save_drive", input());
    expect(error).toBeNull();
    expect(await roundNames(id)).toEqual([
      "Screening",
      "Lab Practical",
      "Panel Interview",
    ]);
  });

  it("rejects duplicate or blank round names and more than 8 rounds", async () => {
    for (const p_rounds of [
      ["A", "a "],
      ["A", " "],
      Array.from({ length: 9 }, (_, i) => `R${i}`),
    ]) {
      const { error } = await H.rpc("hr_save_drive", input({ p_rounds }));
      expect(error?.message).toBe("invalid_rounds");
    }
  });

  it("without candidates rounds can be added, removed and reordered", async () => {
    const created = input();
    const { data: id } = await H.rpc("hr_save_drive", created);
    const { error } = await H.rpc(
      "hr_save_drive",
      input({
        p_drive_id: id,
        p_slug: created.p_slug,
        p_rounds: ["Panel Interview", "Screening"],
      }),
    );
    expect(error).toBeNull();
    expect(await roundNames(id)).toEqual(["Panel Interview", "Screening"]);
  });

  it("with candidates: renaming works, changing the count raises rounds_locked", async () => {
    const created = input();
    const { data: id } = await H.rpc("hr_save_drive", created);
    const me = await newCandidate();
    await apply(me.client, created.p_slug);
    const locked = await H.rpc(
      "hr_save_drive",
      input({ p_drive_id: id, p_rounds: ["Screening", "Lab Practical"] }),
    );
    expect(locked.error?.message).toBe("rounds_locked");
    const renamed = await H.rpc(
      "hr_save_drive",
      input({
        p_drive_id: id,
        p_status: "closed",
        p_rounds: ["Screening", "Lab Test", "Panel Interview"],
      }),
    );
    expect(renamed.error).toBeNull();
    expect(await roundNames(id)).toEqual([
      "Screening",
      "Lab Test",
      "Panel Interview",
    ]);
    const { data: d } = await admin()
      .from("drives")
      .select("status")
      .eq("id", id)
      .single();
    expect(d!.status).toBe("closed");
  });

  it("a candidate can't save drives", async () => {
    const me = await newCandidate();
    const { error } = await me.client.rpc("hr_save_drive", input());
    expect(error?.message).toBe("not_hr");
  });
});
