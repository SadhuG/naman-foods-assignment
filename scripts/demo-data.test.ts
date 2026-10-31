import { describe, expect, it } from "vitest";
import { DEMO_ACCOUNTS } from "../src/lib/demo";
import {
  normalizeAadhaar,
  normalizeAccountNumber,
  normalizeIfsc,
  normalizePan,
  normalizePhone,
  normalizeUan,
} from "../src/lib/ids";
import { buildDemoDataset, stepsFor } from "./demo-data";

const data = buildDemoDataset();
const [A, B] = data.drives;
const all = data.drives.flatMap((d) => d.candidates);

function counts(cands: typeof all) {
  const m: Record<string, number> = {};
  for (const c of cands) {
    const k = `${c.target.status}@${c.target.round}`;
    m[k] = (m[k] ?? 0) + 1;
  }
  return m;
}

describe("buildDemoDataset", () => {
  it("drive A has 47 candidates with the exact (status, round) split", () => {
    expect(A.status).toBe("open");
    expect(A.rounds).toHaveLength(4);
    expect(A.candidates).toHaveLength(47);
    const m = counts(A.candidates);
    const at = (s: string) =>
      Object.entries(m)
        .filter(([k]) => k.startsWith(s + "@"))
        .reduce((n, [, v]) => n + v, 0);
    expect(m["active@1"]).toBe(14);
    expect((m["active@2"] ?? 0) + (m["on_hold@2"] ?? 0)).toBe(9);
    expect(m["on_hold@2"]).toBe(2);
    expect(m["active@3"]).toBe(6);
    expect(m["active@4"]).toBe(4);
    expect(m["selected@4"]).toBe(3);
    expect(m["details_submitted@4"]).toBe(2);
    expect(m["onboarded@4"]).toBe(1);
    expect(at("rejected")).toBe(8);
    expect(
      new Set(
        A.candidates
          .filter((c) => c.target.status === "rejected")
          .map((c) => c.target.round),
      ).size,
    ).toBeGreaterThan(2);
  });

  it("drive B is closed, has 3 custom rounds and 12 candidates", () => {
    expect(B.status).toBe("closed");
    expect(B.rounds).toEqual(["Screening", "Lab Practical", "Panel Interview"]);
    expect(B.candidates).toHaveLength(12);
    const m = counts(B.candidates);
    expect(m["onboarded@3"]).toBe(3);
    expect(m["details_submitted@3"]).toBe(1);
    const rejected = B.candidates.filter((c) => c.target.status === "rejected");
    expect(rejected).toHaveLength(8);
  });

  it("emails are unique and end in @example.com; phones are valid Indian mobiles", () => {
    const emails = all.map((c) => c.email);
    expect(new Set(emails).size).toBe(emails.length);
    for (const e of emails) expect(e).toMatch(/@example\.com$/);
    for (const c of all) expect(c.phone).toMatch(/^[6-9]\d{9}$/);
    for (const c of all) expect(normalizePhone(c.phone)).toBe(c.phone);
  });

  it("Aarav is active in round 3 and Meera is selected, both in drive A", () => {
    const aarav = A.candidates.find(
      (c) => c.email === "demo.aarav@example.com",
    );
    const meera = A.candidates.find(
      (c) => c.email === "demo.meera@example.com",
    );
    expect(aarav?.account).toBe("demo.aarav@example.com");
    expect(aarav?.target).toEqual({ status: "active", round: 3 });
    expect(meera?.target).toEqual({ status: "selected", round: 4 });
    expect(meera?.joining).toBeUndefined();
  });

  it("every details_submitted/onboarded candidate has joining details that survive the normalisers", () => {
    const needs = all.filter((c) =>
      ["details_submitted", "onboarded"].includes(c.target.status),
    );
    expect(needs.length).toBe(2 + 1 + 3 + 1);
    for (const c of needs) {
      const j = c.joining!;
      expect(j).toBeDefined();
      expect(normalizeAadhaar(j.aadhaar_number)).toBe(j.aadhaar_number);
      expect(normalizePan(j.pan_number)).toBe(j.pan_number);
      expect(normalizeIfsc(j.bank_ifsc)).toBe(j.bank_ifsc);
      expect(normalizeAccountNumber(j.bank_account_number)).toBe(
        j.bank_account_number,
      );
      expect(normalizePhone(j.emergency_contact_phone)).toBe(
        j.emergency_contact_phone,
      );
      if (j.uan_number !== null)
        expect(normalizeUan(j.uan_number)).toBe(j.uan_number);
    }
  });

  it('contains "Sharma, Priya", "अनिल कुमार" and an HR note starting with "="', () => {
    const names = all.map((c) => c.full_name);
    expect(names).toContain("Sharma, Priya");
    expect(names).toContain("अनिल कुमार");
    expect(all.some((c) => c.notes.some((n) => n.startsWith("=")))).toBe(true);
  });

  it("each candidate has one note and one candidate message per decision step", () => {
    for (const d of data.drives)
      for (const c of d.candidates) {
        const steps = stepsFor(c, d.rounds.length);
        expect(c.notes).toHaveLength(steps.length);
        expect(c.candidate_messages).toHaveLength(steps.length);
      }
  });

  it("is deterministic", () => {
    expect(buildDemoDataset()).toEqual(buildDemoDataset());
  });

  it("DEMO_ACCOUNTS lists the HR user and the two demo candidates", () => {
    expect(DEMO_ACCOUNTS.map((a) => a.email)).toEqual([
      "demo.hr@example.com",
      "demo.aarav@example.com",
      "demo.meera@example.com",
    ]);
  });
});
