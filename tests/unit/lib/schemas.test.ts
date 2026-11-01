import { describe, expect, it } from "vitest";
import { accountSchema, applySchema } from "../../../src/lib/schemas";

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

describe("joiningSchema", async () => {
  const { joiningSchema, joiningProgressLabel } =
    await import("../../../src/lib/schemas");
  const iso = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const yearsAgo = (y: number, extraDays = 0) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - y);
    d.setDate(d.getDate() + extraDays);
    return d.toISOString().slice(0, 10);
  };
  const sample = {
    date_of_birth: "1999-07-09",
    aadhaar_number: "2345 6789 0123",
    pan_number: "abcde1234f",
    uan_number: "",
    bank_account_holder: "Meera Iyer",
    bank_account_number: "123456789012",
    bank_ifsc: "hdfc0001234",
    address: "12 Gandhi Colony, Jaipur 302001",
    emergency_contact_name: "Lata Iyer",
    emergency_contact_phone: "+91 94140 55679",
    preferred_joining_date: iso(10),
  };
  const errorFor = (over: Record<string, unknown>, field: string) => {
    const r = joiningSchema.safeParse({ ...sample, ...over });
    return r.error?.issues.find((i) => i.path[0] === field)?.message;
  };

  it("normalises loosely typed IDs", () => {
    const r = joiningSchema.parse(sample);
    expect(r.pan_number).toBe("ABCDE1234F");
    expect(r.aadhaar_number).toBe("234567890123");
    expect(r.bank_ifsc).toBe("HDFC0001234");
    expect(r.emergency_contact_phone).toBe("9414055679");
    expect(r.uan_number).toBeNull();
  });
  it("gives field copy for wrong IDs", () => {
    expect(errorFor({ aadhaar_number: "23456789012" }, "aadhaar_number")).toBe(
      "Enter the 12-digit Aadhaar number.",
    );
    expect(errorFor({ pan_number: "ABCD1234F" }, "pan_number")).toBe(
      "PAN looks like ABCDE1234F.",
    );
    expect(errorFor({ bank_ifsc: "HDFC1234" }, "bank_ifsc")).toBe(
      "IFSC looks like HDFC0001234.",
    );
    expect(
      errorFor({ bank_account_number: "1234" }, "bank_account_number"),
    ).toBe("Account numbers are 9–18 digits.");
  });
  it("checks the joining date window and age", () => {
    expect(
      errorFor({ preferred_joining_date: iso(-1) }, "preferred_joining_date"),
    ).toBeTruthy();
    expect(
      errorFor({ preferred_joining_date: iso(91) }, "preferred_joining_date"),
    ).toBeTruthy();
    expect(
      errorFor({ preferred_joining_date: iso(0) }, "preferred_joining_date"),
    ).toBeUndefined();
    expect(
      errorFor({ date_of_birth: yearsAgo(17) }, "date_of_birth"),
    ).toBeTruthy();
    expect(
      errorFor({ date_of_birth: yearsAgo(18, -1) }, "date_of_birth"),
    ).toBeUndefined();
  });
  it("labels joining progress", () => {
    expect(joiningProgressLabel("selected", true)).toBe("Changes requested");
    expect(joiningProgressLabel("selected", false)).toBe("Not started");
    expect(joiningProgressLabel("details_submitted", false)).toBe("Submitted");
    expect(joiningProgressLabel("onboarded", false)).toBe("Onboarded");
  });
});
