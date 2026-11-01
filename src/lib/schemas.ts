import { z } from "zod";
import {
  normalizeAadhaar,
  normalizeAccountNumber,
  normalizeIfsc,
  normalizePan,
  normalizePhone,
  normalizeUan,
} from "./ids";
import type { CandidateStatus } from "./types";

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

export const phoneField = z
  .string()
  .refine((v) => normalizePhone(v) !== null, {
    message: "Enter a 10-digit Indian mobile number.",
  })
  .transform((v) => normalizePhone(v)!);

export const applySchema = z.object({
  full_name: text(2, 80, "Full name"),
  phone: phoneField,
  city: text(2, 60, "City"),
  qualification: text(2, 80, "Qualification"),
  experience_years: z
    .number({ message: "Enter your years of experience." })
    .min(0, "Experience can't be negative.")
    .max(50, "Experience must be 50 years or less.")
    .multipleOf(0.5, "Use whole or half years, like 2 or 2.5."),
  consent: z.literal(true, {
    message: "Please agree so HR can contact you.",
  }),
});
export type ApplyInput = z.output<typeof applySchema>;
export type ApplyFormValues = z.input<typeof applySchema>;

export const accountSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
export type AccountInput = z.output<typeof accountSchema>;

/** A string field cleaned up by one of the ids.ts normalisers. */
const idField = (normalize: (v: string) => string | null, message: string) =>
  z
    .string()
    .refine((v) => normalize(v) !== null, { message })
    .transform((v) => normalize(v)!);

/** Local calendar date as YYYY-MM-DD, `days` from today. */
export function isoDay(days = 0, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ageOn(dob: string, today = new Date()): number {
  const [y, m, d] = dob.split("-").map(Number);
  let age = today.getFullYear() - y!;
  const beforeBirthday =
    today.getMonth() + 1 < m! ||
    (today.getMonth() + 1 === m! && today.getDate() < d!);
  if (beforeBirthday) age -= 1;
  return age;
}

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");

export const joiningSchema = z.object({
  date_of_birth: dateField.refine(
    (v) => {
      const age = ageOn(v);
      return age >= 18 && age <= 65;
    },
    { message: "You need to be between 18 and 65." },
  ),
  aadhaar_number: idField(
    normalizeAadhaar,
    "Enter the 12-digit Aadhaar number.",
  ),
  pan_number: idField(normalizePan, "PAN looks like ABCDE1234F."),
  uan_number: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || normalizeUan(v) !== null, {
      message: "UAN is 12 digits. Leave it empty if you don't have one.",
    })
    .transform((v) => (v?.trim() ? normalizeUan(v)! : null)),
  bank_account_holder: text(2, 80, "Account holder name"),
  bank_account_number: idField(
    normalizeAccountNumber,
    "Account numbers are 9–18 digits.",
  ),
  bank_ifsc: idField(normalizeIfsc, "IFSC looks like HDFC0001234."),
  address: text(10, 300, "Address"),
  emergency_contact_name: text(2, 80, "Contact name"),
  emergency_contact_phone: phoneField,
  preferred_joining_date: dateField.refine(
    (v) => v >= isoDay(0) && v <= isoDay(90),
    { message: "Pick a date from today to 90 days out." },
  ),
});
export type JoiningInput = z.output<typeof joiningSchema>;
export type JoiningFormValues = z.input<typeof joiningSchema>;

export type JoiningProgress =
  "Not started" | "Submitted" | "Changes requested" | "Onboarded";

export function joiningProgressLabel(
  status: CandidateStatus,
  changesRequested: boolean,
): JoiningProgress {
  if (status === "onboarded") return "Onboarded";
  if (status === "details_submitted") return "Submitted";
  return changesRequested ? "Changes requested" : "Not started";
}
