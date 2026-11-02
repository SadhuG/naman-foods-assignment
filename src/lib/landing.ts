// Static content for the public landing and notes pages. The funnel mirrors the
// seeded Walk-in drive (scripts/demo-data.ts); a unit test keeps them in step.

export const DEMO_DRIVE = {
  slug: "demo-production-associates",
  title: "Walk-in drive: Production Associates",
  summary: "Bhiwadi plant, 12 openings, 4 interview rounds",
};

export type FunnelStage = { count: number; label: string };

/** How many people reached each step of the demo Walk-in drive. */
export const DEMO_FUNNEL: FunnelStage[] = [
  { count: 47, label: "applied" },
  { count: 30, label: "reached the Aptitude Test" },
  { count: 19, label: "reached the Technical Interview" },
  { count: 11, label: "reached the HR Interview" },
  { count: 6, label: "selected" },
];

/** Of the selected people, how many are already marked as joined. */
export const DEMO_JOINED = 1;

/** Time budgets from the build plan, in hours. Planned, not logged. */
export const PLANNED_HOURS: Array<[phase: string, hours: number]> = [
  ["Design in Figma", 5],
  ["Project setup", 1.5],
  ["Database and security", 2.5],
  ["Demo data", 1],
  ["Candidate pages", 2.5],
  ["HR drives", 2],
  ["Pipeline and decisions", 3],
  ["Joining details", 2],
  ["Emails and texts", 2],
  ["CSV export", 1.5],
  ["Polish and handoff", 1.5],
];

export const REPO_URL = "https://github.com/SadhuG/naman-foods-assignment";

const WORDS = [
  "none",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const word = (n: number) => WORDS[n] ?? String(n);

/** "One of the six has already joined." */
export function joinedSentence(joined: number, selected: number) {
  const first = word(joined);
  return `${first[0]!.toUpperCase()}${first.slice(1)} of the ${word(selected)} ${joined === 1 ? "has" : "have"} already joined.`;
}
