import { describe, expect, it } from "vitest";
import {
  allowedDecisions,
  countByStage,
  decisionToast,
  filterByStage,
  matchesSearch,
  nextStageLabel,
  stageOf,
} from "../../../src/lib/pipeline";
import type { Candidate, DriveRound } from "../../../src/lib/types";

const rounds = (n: number): DriveRound[] =>
  ["Screening", "Aptitude Test", "Technical Interview", "HR Interview"]
    .slice(0, n)
    .map((name, i) => ({ id: `r${i}`, drive_id: "d", position: i + 1, name }));

const cand = (over: Partial<Candidate>): Candidate => ({
  id: Math.random().toString(36),
  drive_id: "d",
  user_id: null,
  full_name: "Sharma, Priya",
  email: "priya@example.com",
  phone: "9876543210",
  city: "Alwar",
  qualification: "ITI",
  experience_years: 1,
  current_round: 1,
  status: "active",
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
  ...over,
});

describe("stageOf", () => {
  it("puts on-hold people in their round and later statuses in selected", () => {
    expect(stageOf({ status: "on_hold", current_round: 2 })).toBe("round-2");
    expect(stageOf({ status: "details_submitted", current_round: 4 })).toBe(
      "selected",
    );
    expect(stageOf({ status: "rejected", current_round: 2 })).toBe("rejected");
  });
});

describe("countByStage / filterByStage", () => {
  it("has every key even when empty", () => {
    expect(countByStage([], rounds(3))).toEqual({
      "round-1": 0,
      "round-2": 0,
      "round-3": 0,
      selected: 0,
      rejected: 0,
      all: 0,
    });
  });
  it("counts and filters", () => {
    const cs = [
      cand({}),
      cand({ status: "on_hold" }),
      cand({ current_round: 2 }),
      cand({ status: "onboarded", current_round: 3 }),
      cand({ status: "rejected" }),
    ];
    expect(countByStage(cs, rounds(3))).toMatchObject({
      "round-1": 2,
      "round-2": 1,
      selected: 1,
      rejected: 1,
      all: 5,
    });
    expect(filterByStage(cs, "round-1")).toHaveLength(2);
    expect(filterByStage(cs, "all")).toHaveLength(5);
  });
});

describe("allowedDecisions", () => {
  it("mirrors hr_decide", () => {
    expect(allowedDecisions("active")).toEqual([
      "approved",
      "on_hold",
      "rejected",
    ]);
    expect(allowedDecisions("on_hold")).toEqual(["approved", "rejected"]);
    expect(allowedDecisions("rejected")).toEqual(["reopened"]);
    for (const s of ["selected", "details_submitted", "onboarded"] as const)
      expect(allowedDecisions(s)).toEqual([]);
  });
});

describe("nextStageLabel", () => {
  it("names the next round, or Selected at the last one", () => {
    expect(nextStageLabel(cand({ current_round: 4 }), rounds(4))).toBe(
      "Selected",
    );
    expect(nextStageLabel(cand({ current_round: 2 }), rounds(4))).toBe(
      "Technical Interview",
    );
  });
});

describe("matchesSearch", () => {
  it("matches name, email or phone, ignoring case", () => {
    expect(matchesSearch(cand({}), "98765")).toBe(true);
    expect(matchesSearch(cand({}), "PRIYA")).toBe(true);
    expect(matchesSearch(cand({}), "@EXAMPLE")).toBe(true);
    expect(matchesSearch(cand({}), "  ")).toBe(true);
    expect(matchesSearch(cand({}), "rohan")).toBe(false);
  });

  it("matches a phone typed the way the table shows it", () => {
    // stored 9876543210, shown "98765 43210"
    expect(matchesSearch(cand({}), "98765 43210")).toBe(true);
    expect(matchesSearch(cand({}), "+91 98765-43210")).toBe(true);
    expect(matchesSearch(cand({}), "098765 43210")).toBe(true);
    expect(matchesSearch(cand({}), "43 21")).toBe(true);
    expect(matchesSearch(cand({}), "98765 99999")).toBe(false);
    // a lone space-separated word is still a name search
    expect(matchesSearch(cand({}), "1 2")).toBe(false);
  });
});

describe("decisionToast", () => {
  it("reports moved and skipped", () => {
    expect(
      decisionToast(
        "approved",
        { moved: 12, skipped: 2 },
        "Technical Interview",
      ),
    ).toBe("12 moved to Technical Interview · 2 skipped (already decided)");
    expect(decisionToast("on_hold", { moved: 3, skipped: 0 }, "")).toBe(
      "3 put on hold",
    );
    expect(decisionToast("rejected", { moved: 1, skipped: 0 }, "")).toBe(
      "1 rejected",
    );
    expect(decisionToast("reopened", { moved: 2, skipped: 1 }, "")).toBe(
      "2 reopened · 1 skipped (already decided)",
    );
  });
});
