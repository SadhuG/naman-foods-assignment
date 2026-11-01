// Excel-safe CSV: UTF-8 BOM, CRLF rows, RFC 4180 quoting, formula guard,
// and ID numbers forced to text so Excel keeps every digit.

/** `{ text }` marks a value (ID or account number) that must stay text in Excel. */
export type Cell = string | number | null | undefined | { text: string };

const NEEDS_QUOTES = /[",\r\n]/;
const FORMULA_START = /^[=+\-@\t\r]/;

function quote(s: string): string {
  return NEEDS_QUOTES.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function guard(s: string): string {
  return FORMULA_START.test(s) ? `'${s}` : s;
}

function field(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "number")
    return Number.isFinite(cell) ? String(cell) : "";
  if (typeof cell === "object") {
    // ="0012…" shows the digits as text; only for plain alphanumeric values.
    if (/^[A-Z0-9]+$/.test(cell.text)) return quote(`="${cell.text}"`);
    return quote(guard(cell.text));
  }
  return quote(guard(cell));
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return (
    "﻿" +
    [headers.map(field), ...rows.map((r) => r.map(field))]
      .map((r) => r.join(","))
      .join("\r\n")
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local date as YYYY-MM-DD. */
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local "YYYY-MM-DD HH:mm" for date cells. */
export function csvDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function csvFilename(slug: string, label: string, date: Date): string {
  return `${slug}_${label}_${localDate(date)}.csv`;
}

/** Lower-case hyphenated label: "Technical Interview" → "technical-interview". */
export const csvLabel = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "export";

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
