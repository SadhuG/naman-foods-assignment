import { describe, expect, it } from "vitest";
import { csvFilename, toCsv } from "./csv";

const one = (cell: Parameters<typeof toCsv>[1][number][number]) =>
  toCsv(["h"], [[cell]]).slice("﻿h\r\n".length);

describe("toCsv", () => {
  it("starts with a BOM and joins rows with CRLF", () => {
    const csv = toCsv(
      ["a", "b"],
      [
        ["1", "2"],
        ["3", "4"],
      ],
    );
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿a,b\r\n1,2\r\n3,4");
  });
  it("quotes commas, quotes and line breaks", () => {
    expect(one('Sharma, Priya "PJ"')).toBe('"Sharma, Priya ""PJ"""');
    expect(one("line1\nline2")).toBe('"line1\nline2"');
  });
  it("guards formula-looking text but not numbers", () => {
    expect(one("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(one("-5")).toBe("'-5");
    expect(one("+91")).toBe("'+91");
    expect(one("@me")).toBe("'@me");
    expect(one("\tx")).toBe("'\tx");
    expect(one(-5)).toBe("-5");
  });
  it('forces IDs to text with the ="…" form', () => {
    expect(one({ text: "0012345678901234" })).toBe('"=""0012345678901234"""');
    expect(one({ text: "=1+1" })).toBe("'=1+1");
  });
  it("leaves empty and non-Latin values alone", () => {
    expect(one(null)).toBe("");
    expect(one(undefined)).toBe("");
    expect(one("अनिल कुमार")).toBe("अनिल कुमार");
  });
});

describe("csvFilename", () => {
  it("joins slug, label and local date", () => {
    expect(
      csvFilename("demo-walkin", "technical-interview", new Date(2026, 10, 1)),
    ).toBe("demo-walkin_technical-interview_2026-11-01.csv");
  });
});
