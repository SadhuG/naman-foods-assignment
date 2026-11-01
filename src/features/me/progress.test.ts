import { describe, expect, it } from "vitest";
import type { MyApplication } from "../../lib/types";
import { buildTimeline, latestNote } from "./progress";

const rounds = [
  "Screening",
  "Aptitude Test",
  "Technical Interview",
  "HR Interview",
].map((name, i) => ({ position: i + 1, name }));
const app = (over: Partial<MyApplication>): MyApplication => ({
  candidate_id: "c1",
  full_name: "Aarav Mehta",
  status: "active",
  current_round: 3,
  applied_at: "2026-10-22T10:00:00Z",
  drive: { title: "Walk-in", role: "PA", location: "Bhiwadi" },
  rounds,
  timeline: [
    {
      round_position: 1,
      round_name: "Screening",
      decision: "approved",
      candidate_message: null,
      decided_at: "2026-10-24T10:00:00Z",
    },
    {
      round_position: 2,
      round_name: "Aptitude Test",
      decision: "approved",
      candidate_message: "Bring ID",
      decided_at: "2026-10-28T10:00:00Z",
    },
  ],
  joining_details: null,
  ...over,
});

describe("buildTimeline", () => {
  it("round 3 current, 1–2 done, 4 upcoming", () => {
    const t = buildTimeline(app({}));
    expect(t.map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "upcoming",
    ]);
    expect(t[0].date).toBe("2026-10-24T10:00:00Z");
    expect(t[1].message).toBe("Bring ID");
    expect(t[2].date).toBeNull();
  });
  it("on hold and rejected mark the current round", () => {
    expect(buildTimeline(app({ status: "on_hold" }))[2].state).toBe("on_hold");
    expect(buildTimeline(app({ status: "rejected" }))[2].state).toBe(
      "rejected",
    );
  });
  it("selected marks every round done", () => {
    const t = buildTimeline(app({ status: "selected", current_round: 4 }));
    expect(t.every((s) => s.state === "done")).toBe(true);
  });
  it("latestNote is the newest candidate message", () => {
    expect(latestNote(app({}))).toBe("Bring ID");
    expect(latestNote(app({ timeline: [] }))).toBeNull();
  });
});
