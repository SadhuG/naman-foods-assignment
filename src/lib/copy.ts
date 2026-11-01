// Shared wording and option lists.

export const QUALIFICATIONS = [
  "10th pass",
  "12th pass (Science)",
  "12th pass (other)",
  "ITI — Fitter",
  "ITI — Electrician",
  "ITI — Machinist",
  "ITI — other trade",
  "Diploma — Mechanical",
  "Diploma — Food Technology",
  "Diploma — other",
  "B.Sc Chemistry",
  "B.Sc Food Technology",
  "B.Sc Microbiology",
  "B.Com",
  "B.Tech Food Technology",
  "B.Tech / B.E. — other",
  "M.Sc Chemistry",
  "M.Sc Food Science",
  "Other graduate degree",
  "Other postgraduate degree",
];

/** What each common round means for a candidate. Rounds with other names get no blurb. */
export const ROUND_BLURBS: Record<string, string> = {
  Screening: "We check your form against the role. Usually within 2 days.",
  "Aptitude Test":
    "A 30-minute paper test at the plant: numbers, reading, safety basics.",
  "Technical Interview":
    "A supervisor walks you through the line and asks about machines you've used.",
  "HR Interview":
    "Pay, shifts and joining date. Then you hear back the same week.",
  "Lab Practical": "A short hands-on test in the QC lab.",
  "Panel Interview": "A conversation with the QC head and the plant manager.",
};

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const dateYearFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "24 Oct" (adds the year when it isn't this year). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear()
    ? dateFmt.format(d)
    : dateYearFmt.format(d);
}
export const longDate = (iso: string) => dateYearFmt.format(new Date(iso));
export const dateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export const formatPhone = (p: string) =>
  p.length === 10 ? `${p.slice(0, 5)} ${p.slice(5)}` : p;

export const years = (n: number) => (n === 1 ? "1 year" : `${n} years`);

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
/** "12 minutes ago", "yesterday", "3 days ago". */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
