import { describe, expect, it } from "vitest";
import { renderMessage, TEMPLATE_LABELS } from "../../../src/lib/messages";
import { MESSAGE_TEMPLATES, type MessageParams } from "../../../src/lib/types";

const ctx = { appUrl: "https://hire.example", candidateId: "c-123" };
const base: MessageParams = {
  candidate_name: "Aarav Mehta",
  drive_title: "Production Associate",
  company: "Naman Foods",
};

describe("renderMessage", () => {
  it.each(MESSAGE_TEMPLATES)("%s fits: subject, paragraphs, SMS ≤ 160", (t) => {
    const long: MessageParams = {
      candidate_name: "Venkatanarasimharajuvaripeta Subramaniam",
      drive_title:
        "Walk-in drive: Production Associates and Packing Line Operators, Nov 2026",
      company: "Naman Foods",
      round_name: "Technical Interview",
      next_round_name: "HR Interview",
      hr_message: "Bring a pen",
      reason: "The IFSC belongs to another branch.",
      joining_date: "2026-11-17",
    };
    expect(long.candidate_name).toHaveLength(40);
    expect(long.drive_title.length).toBeGreaterThanOrEqual(70);
    const m = renderMessage(t, long, ctx);
    expect(m.subject).not.toBe("");
    expect(m.paragraphs.length).toBeGreaterThanOrEqual(1);
    expect(m.sms.length).toBeLessThanOrEqual(160);
    expect(m.sms).not.toContain("Bring a pen");
    expect(m.sms.endsWith("namanfoods.example/me")).toBe(true);
    expect(TEMPLATE_LABELS[t]).toBeTruthy();
  });

  it("moved_to_round subject, greeting and CTA", () => {
    const m = renderMessage(
      "moved_to_round",
      { ...base, next_round_name: "Technical Interview" },
      ctx,
    );
    expect(m.subject).toBe("You're through to the Technical Interview");
    expect(m.greeting).toBe("Hi Aarav,");
    expect(m.cta.href).toBe("https://hire.example/me/applications/c-123");
  });

  it("carries the HR message in the email only", () => {
    const m = renderMessage(
      "on_hold",
      { ...base, hr_message: "Bring a pen" },
      ctx,
    );
    expect(m.hrMessage).toBe("Bring a pen");
    expect(m.sms).not.toContain("Bring a pen");
    expect(renderMessage("on_hold", base, ctx).hrMessage).toBeNull();
  });

  it("changes_requested includes the reason", () => {
    const m = renderMessage(
      "changes_requested",
      { ...base, reason: "Check your IFSC." },
      ctx,
    );
    expect(m.paragraphs.join(" ")).toContain("Check your IFSC.");
  });

  it("uses the first name for names written 'Last, First'", () => {
    expect(
      renderMessage(
        "selected",
        { ...base, candidate_name: "Sharma, Priya" },
        ctx,
      ).greeting,
    ).toBe("Hi Priya,");
  });
});
