import { z } from "zod";
import { normalizePhone } from "./ids";

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
