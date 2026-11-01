import { describe, expect, it } from "vitest";
import { accountSchema, applySchema } from "./schemas";

const base = {
  full_name: "Riya Sen",
  phone: "+91 98765 43210",
  city: "Jaipur",
  qualification: "B.Sc",
  experience_years: 2,
  consent: true,
};

describe("applySchema", () => {
  it("normalises the phone number", () => {
    const r = applySchema.parse(base);
    expect(r.phone).toBe("9876543210");
  });
  it("rejects 51 years of experience", () => {
    expect(
      applySchema.safeParse({ ...base, experience_years: 51 }).success,
    ).toBe(false);
  });
  it("rejects missing consent", () => {
    expect(applySchema.safeParse({ ...base, consent: false }).success).toBe(
      false,
    );
  });
  it("rejects a bad phone with a field message", () => {
    const r = applySchema.safeParse({ ...base, phone: "12345" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["phone"]);
  });
});

describe("accountSchema", () => {
  it("rejects a 7-character password", () => {
    expect(
      accountSchema.safeParse({ email: "a@b.co", password: "1234567" }).success,
    ).toBe(false);
  });
  it("lower-cases the email", () => {
    expect(
      accountSchema.parse({ email: " A@B.co ", password: "12345678" }).email,
    ).toBe("a@b.co");
  });
});
