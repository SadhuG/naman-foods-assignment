import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { Checkbox, Field, Input, Select } from "../../components/ui/Field";
import { QUALIFICATIONS } from "../../lib/copy";
import {
  accountSchema,
  applySchema,
  type AccountInput,
  type ApplyInput,
} from "../../lib/schemas";

const newAccountSchema = applySchema.extend(accountSchema.shape);
type Values = z.input<typeof newAccountSchema>;

export type ApplySubmit = ApplyInput & Partial<AccountInput>;

/**
 * Signed out: profile + email + password (creates the account).
 * Signed in: profile only, prefilled from the candidate's last application.
 */
export function ApplyForm({
  needsAccount,
  defaults,
  hideName,
  submitLabel,
  onSubmit,
}: {
  needsAccount: boolean;
  defaults?: Partial<Values>;
  hideName?: boolean;
  submitLabel: string;
  onSubmit: (values: ApplySubmit) => Promise<void>;
}) {
  const schema = needsAccount ? newAccountSchema : applySchema;
  const form = useForm<Values, unknown, ApplySubmit>({
    resolver: zodResolver(schema as typeof newAccountSchema),
    defaultValues: useMemo(
      () => ({ consent: false as unknown as true, ...defaults }),
      [defaults],
    ),
    mode: "onTouched",
  });
  const e = form.formState.errors;
  const qualification = form.watch("qualification");
  const options =
    qualification && !QUALIFICATIONS.includes(qualification)
      ? [qualification, ...QUALIFICATIONS]
      : QUALIFICATIONS;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {!hideName && (
        <Field
          label="Full name"
          hint="As on your Aadhaar card"
          error={e.full_name?.message}
        >
          <Input autoComplete="name" {...form.register("full_name")} />
        </Field>
      )}
      {needsAccount && (
        <Field
          label="Email"
          hint="Your login and where updates go"
          error={e.email?.message}
        >
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            {...form.register("email")}
          />
        </Field>
      )}
      <Field
        label="Mobile number"
        hint="10 digits. We send round updates by SMS"
        error={e.phone?.message}
      >
        <Input
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          placeholder="+91 98290 11234"
          {...form.register("phone")}
        />
      </Field>
      <Field label="City" hint="Where you live now" error={e.city?.message}>
        <Input autoComplete="address-level2" {...form.register("city")} />
      </Field>
      <Field
        label="Highest qualification"
        hint="Pick the closest match"
        error={e.qualification?.message && "Pick your highest qualification."}
      >
        <Select {...form.register("qualification")}>
          <option value="">Choose one</option>
          {options.map((q) => (
            <option key={q}>{q}</option>
          ))}
        </Select>
      </Field>
      <Field
        label="Work experience (years)"
        hint="0 if you're a fresher"
        error={e.experience_years?.message}
      >
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          max={50}
          step={0.5}
          {...form.register("experience_years", {
            setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
          })}
        />
      </Field>
      {needsAccount && (
        <Field
          label="Create a password"
          hint="At least 8 characters"
          error={e.password?.message}
        >
          <Input
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
        </Field>
      )}
      <Checkbox
        label="Naman Foods can contact me by email and SMS about this drive."
        error={e.consent?.message}
        {...form.register("consent")}
      />
      <Button
        type="submit"
        loading={form.formState.isSubmitting}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
