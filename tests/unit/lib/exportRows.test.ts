import { describe, expect, it } from "vitest";
import {
  buildCandidateRows,
  buildDecisionLog,
  buildFullReport,
  buildMessageLog,
  STAGE_HEADERS,
  type ExportInput,
} from "../../../src/lib/exportRows";
import { renderMessage } from "../../../src/lib/messages";
import type { Candidate, RoundDecision } from "../../../src/lib/types";

const rounds = ["Screening", "Aptitude Test", "Technical Interview"].map(
  (name, i) => ({ id: `r${i}`, drive_id: "d", position: i + 1, name }),
);
const cand = (id: string, over: Partial<Candidate>): Candidate => ({
  id,
  drive_id: "d",
  user_id: null,
  full_name: id,
  email: `${id}@example.com`,
  phone: "9876543210",
  city: "Alwar",
  qualification: "ITI",
  experience_years: 1,
  current_round: 1,
  status: "active",
  created_at: "2026-10-20T10:00:00Z",
  updated_at: "2026-10-20T10:00:00Z",
  ...over,
});
const dec = (
  candidate_id: string,
  round_position: number,
  decision: RoundDecision["decision"],
  decided_at: string,
  note: string | null = null,
): RoundDecision => ({
  id: `${candidate_id}-${round_position}-${decided_at}`,
  candidate_id,
  round_position,
  round_name: rounds[round_position - 1]!.name,
  decision,
  note,
  candidate_message: null,
  decided_by: null,
  decided_at,
});

const input: ExportInput = {
  drive: {
    id: "d",
    slug: "demo",
    title: "Walk-in",
    role: "PA",
    location: "Bhiwadi",
    openings: 2,
    description: "",
    status: "open",
    created_at: "2026-10-01T00:00:00Z",
  },
  rounds,
  candidates: [
    cand("rejected", { status: "rejected", current_round: 2 }),
    cand("onboarded", { status: "onboarded", current_round: 3, user_id: "u" }),
    cand("fresh", {}),
  ],
  decisions: [
    dec("rejected", 1, "approved", "2026-10-21T10:00:00Z"),
    dec("rejected", 2, "rejected", "2026-10-23T10:00:00Z", "=Below cut-off"),
    dec("onboarded", 1, "on_hold", "2026-10-21T09:00:00Z"),
    dec("onboarded", 1, "approved", "2026-10-22T09:00:00Z"),
    dec("onboarded", 2, "approved", "2026-10-24T09:00:00Z"),
    dec("onboarded", 3, "approved", "2026-10-26T09:00:00Z"),
  ],
  joining: [
    {
      candidate_id: "onboarded",
      date_of_birth: "1999-01-01",
      aadhaar_number: "234567890123",
      pan_number: "ABCDE1234F",
      uan_number: null,
      bank_account_holder: "On Boarded",
      bank_account_number: "0012345678901234",
      bank_ifsc: "HDFC0001234",
      address: "Somewhere, Jaipur",
      emergency_contact_name: "Kin",
      emergency_contact_phone: "9414055679",
      preferred_joining_date: "2026-11-17",
      submitted_at: "2026-10-27T09:00:00Z",
      changes_requested_reason: null,
    },
  ],
  messages: [
    {
      id: "m1",
      candidate_id: "fresh",
      template: "application_received",
      params: {
        candidate_name: "fresh",
        drive_title: "Walk-in",
        company: "Naman Foods",
      },
      created_at: "2026-10-20T10:00:00Z",
    },
  ],
  appUrl: "https://x",
};

describe("export rows", () => {
  it("stage rows use the 12 stage headers", () => {
    const t = buildCandidateRows(input, input.candidates);
    expect(t.headers).toEqual(STAGE_HEADERS);
    expect(t.headers).toHaveLength(12);
    expect(t.rows).toHaveLength(3);
  });

  it("full report has 34 columns with the latest decision per round", () => {
    const t = buildFullReport(input);
    expect(t.headers).toHaveLength(34);
    const col = (h: string) => t.headers.indexOf(h);
    const row = (id: string) =>
      t.rows[input.candidates.findIndex((c) => c.id === id)]!;
    expect(row("rejected")[col("Aptitude Test decision")]).toBe("rejected");
    expect(row("rejected")[col("Aptitude Test note")]).toBe("=Below cut-off");
    expect(row("rejected")[col("Technical Interview decision")]).toBe("");
    expect(row("onboarded")[col("Screening decision")]).toBe("approved");
    expect(row("onboarded")[col("Aadhaar")]).toEqual({ text: "234567890123" });
    expect(row("fresh")[col("Aadhaar")]).toBe("");
  });

  it("decision log is oldest first; message log subject matches the template", () => {
    const d = buildDecisionLog(input);
    expect(d.headers).toEqual([
      "Candidate",
      "Email",
      "Round",
      "Decision",
      "Internal note",
      "Message to candidate",
      "Decided at",
    ]);
    const times = d.rows.map((r) => r[6] as string);
    expect([...times].sort()).toEqual(times);
    const m = buildMessageLog(input);
    expect(m.rows[0]![3]).toBe(
      renderMessage("application_received", input.messages[0]!.params, {
        appUrl: "https://x",
        candidateId: "fresh",
      }).subject,
    );
  });
});
