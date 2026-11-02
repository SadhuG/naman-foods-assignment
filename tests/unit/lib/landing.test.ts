import { describe, expect, it } from "vitest";
import { buildDemoDataset } from "../../../scripts/demo-data";
import {
  DEMO_DRIVE,
  DEMO_FUNNEL,
  DEMO_JOINED,
  joinedSentence,
  PLANNED_HOURS,
} from "../../../src/lib/landing";

const FINAL = ["selected", "details_submitted", "onboarded"];

describe("landing page numbers", () => {
  const drive = buildDemoDataset().drives.find(
    (d) => d.slug === DEMO_DRIVE.slug,
  )!;
  const people = drive.candidates;

  it("names the seeded Walk-in drive", () => {
    expect(drive.title).toBe(DEMO_DRIVE.title);
    expect(drive.rounds).toHaveLength(4);
  });

  it("funnel counts match the seeded drive", () => {
    const reached = (round: number) =>
      people.filter((c) => c.target.round >= round).length;
    const selected = people.filter((c) =>
      FINAL.includes(c.target.status),
    ).length;
    expect(DEMO_FUNNEL.map((s) => s.count)).toEqual([
      people.length,
      reached(2),
      reached(3),
      reached(4),
      selected,
    ]);
    expect(people.filter((c) => c.target.status === "onboarded")).toHaveLength(
      DEMO_JOINED,
    );
  });

  it("planned hours add up to the plan's 24.5", () => {
    expect(PLANNED_HOURS.reduce((n, [, h]) => n + h, 0)).toBe(24.5);
  });

  it("spells out the joined sentence", () => {
    expect(joinedSentence(1, 6)).toBe("One of the six has already joined.");
    expect(joinedSentence(0, 6)).toBe("None of the six have already joined.");
    expect(joinedSentence(2, 12)).toBe("Two of the 12 have already joined.");
  });
});
