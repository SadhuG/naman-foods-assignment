import { describe, expect, it } from "vitest";
import { DEFAULT_ROUNDS, driveSchema, slugify } from "./drives";

const valid = {
  title: "Production Associates",
  role: "Production Associate",
  location: "Bhiwadi, Rajasthan",
  openings: 12,
  description: "Join the line.",
  rounds: [...DEFAULT_ROUNDS],
};

describe("slugify", () => {
  it("makes a readable slug with the suffix", () => {
    expect(slugify("Production Associate — Walk-in, Nov 2026", "x7k2")).toBe(
      "production-associate-walk-in-nov-2026-x7k2",
    );
  });
  it("is never empty", () => {
    expect(slugify("उत्पादन Drive", "a1b2")).toBe("drive-a1b2");
    expect(slugify("उत्पादन", "a1b2")).toBe("drive-a1b2");
  });
});

describe("driveSchema", () => {
  it("accepts the default template", () => {
    expect(driveSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["0 rounds", { rounds: [] }],
    ["9 rounds", { rounds: Array.from({ length: 9 }, (_, i) => `R${i}`) }],
    ["a blank round", { rounds: ["Screening", "  "] }],
    ["duplicate rounds", { rounds: ["Screening", "screening "] }],
    ["0 openings", { openings: 0 }],
  ])("rejects %s", (_, over) => {
    expect(driveSchema.safeParse({ ...valid, ...over }).success).toBe(false);
  });
});
