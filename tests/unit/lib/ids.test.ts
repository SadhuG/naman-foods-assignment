import { describe, expect, it } from "vitest";
import {
  maskId,
  normalizeAadhaar,
  normalizeAccountNumber,
  normalizeIfsc,
  normalizePan,
  normalizePhone,
  normalizeUan,
} from "../../../src/lib/ids";

describe("normalizePhone", () => {
  it("strips +91, spaces and dashes", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalizePhone("098765 43210")).toBe("9876543210");
  });
  it("rejects numbers that can't be Indian mobiles", () => {
    expect(normalizePhone("5876543210")).toBeNull();
    expect(normalizePhone("98765")).toBeNull();
  });
});

describe("normalizeAadhaar", () => {
  it("accepts 12 digits typed with spaces", () => {
    expect(normalizeAadhaar("2345 6789 0123")).toBe("234567890123");
  });
  it("rejects 11 digits and a leading 0 or 1", () => {
    expect(normalizeAadhaar("23456789012")).toBeNull();
    expect(normalizeAadhaar("134567890123")).toBeNull();
  });
});

describe("normalizePan", () => {
  it("upper-cases", () => {
    expect(normalizePan("abcde1234f")).toBe("ABCDE1234F");
    expect(normalizePan(" abcde-1234-f ")).toBe("ABCDE1234F");
  });
  it("rejects a short PAN", () => {
    expect(normalizePan("ABCD1234F")).toBeNull();
  });
});

describe("normalizeIfsc", () => {
  it("upper-cases", () => {
    expect(normalizeIfsc("hdfc0001234")).toBe("HDFC0001234");
  });
  it("requires 0 as the 5th character", () => {
    expect(normalizeIfsc("HDFC1001234")).toBeNull();
  });
});

describe("normalizeUan", () => {
  it("accepts 12 digits", () => {
    expect(normalizeUan("1001 2345 6789")).toBe("100123456789");
    expect(normalizeUan("12345")).toBeNull();
  });
});

describe("normalizeAccountNumber", () => {
  it("keeps leading zeros", () => {
    expect(normalizeAccountNumber("0012 3456 789")).toBe("00123456789");
  });
  it("rejects 8 or 19 digits", () => {
    expect(normalizeAccountNumber("12345678")).toBeNull();
    expect(normalizeAccountNumber("1234567890123456789")).toBeNull();
  });
});

describe("maskId", () => {
  it("groups 12-digit numbers in fours", () => {
    expect(maskId("234567890123")).toBe("XXXX XXXX 0123");
  });
  it("keeps the last 4 of other ids", () => {
    expect(maskId("ABCDE1234F")).toBe("XXXXXX234F");
    expect(maskId("50100234567812", 4)).toBe("XXXXXXXXXX7812");
  });
});
