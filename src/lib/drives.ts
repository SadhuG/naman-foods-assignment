import { z } from "zod";

export const DEFAULT_ROUNDS = [
  "Screening",
  "Aptitude Test",
  "Technical Interview",
  "HR Interview",
];
export const MAX_ROUNDS = 8;

/** "Production Associate — Walk-in, Nov 2026" + "x7k2" → "production-associate-walk-in-nov-2026-x7k2". */
export function slugify(title: string, suffix: string): string {
  const base = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return `${base || "drive"}-${suffix}`;
}

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .max(max, `Keep it under ${max} characters.`);

export const driveSchema = z.object({
  title: text("a title", 120),
  role: text("the role", 80),
  location: text("a location", 80),
  openings: z
    .number({ message: "Enter the number of openings." })
    .int("Use a whole number.")
    .min(1, "At least 1 opening.")
    .max(1000, "1000 openings at most."),
  description: z.string().trim().max(2000, "Keep it under 2000 characters."),
  rounds: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Name every round.")
        .max(60, "Keep round names short."),
    )
    .min(1, "Add at least one round.")
    .max(MAX_ROUNDS, `${MAX_ROUNDS} rounds at most.`)
    .superRefine((rounds, ctx) => {
      const seen = new Set<string>();
      rounds.forEach((r, i) => {
        const key = r.trim().toLowerCase();
        if (key && seen.has(key))
          ctx.addIssue({
            code: "custom",
            path: [i],
            message: "Each round needs its own name.",
          });
        seen.add(key);
      });
    }),
});
export type DriveInput = z.output<typeof driveSchema>;
export type DriveFormValues = z.input<typeof driveSchema>;

export type FunnelRow = {
  key: string;
  label: string;
  count: number;
  kind: "round" | "selected" | "rejected";
};

const SELECTED = new Set(["selected", "details_submitted", "onboarded"]);

/** People waiting in each round (active or on hold), then everyone selected, then rejected. */
export function funnelFor(
  rounds: Array<{ position: number; name: string }>,
  candidates: Array<{ status: string; current_round: number }>,
): FunnelRow[] {
  const inRound = (p: number) =>
    candidates.filter(
      (c) =>
        c.current_round === p &&
        (c.status === "active" || c.status === "on_hold"),
    ).length;
  return [
    ...[...rounds]
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        key: `round-${r.position}`,
        label: r.name,
        count: inRound(r.position),
        kind: "round" as const,
      })),
    {
      key: "selected",
      label: "Selected",
      count: candidates.filter((c) => SELECTED.has(c.status)).length,
      kind: "selected",
    },
    {
      key: "rejected",
      label: "Rejected",
      count: candidates.filter((c) => c.status === "rejected").length,
      kind: "rejected",
    },
  ];
}
