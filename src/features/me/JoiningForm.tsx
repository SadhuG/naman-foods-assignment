import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Banner } from "../../components/ui/Banner";
import { Card } from "../../components/ui/Brand";
import { Button } from "../../components/ui/Button";
import { Field, FieldError, Input, Textarea } from "../../components/ui/Field";
import { MaskedValue } from "../../components/ui/MaskedValue";
import { candidateKeys, submitJoiningDetails } from "../../lib/api/candidate";
import { friendlyError } from "../../lib/api/errors";
import { firstName, formatPhone, longDate } from "../../lib/copy";
import {
  isoDay,
  joiningSchema,
  type JoiningFormValues,
  type JoiningInput,
} from "../../lib/schemas";
import type { JoiningDetails, MyApplication } from "../../lib/types";

const grouped = (v: string) =>
  /^\d{12}$/.test(v) ? v.replace(/(\d{4})(?=\d)/g, "$1 ") : v;

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-border-default pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left w-full text-title">
        {title}
        {note && (
          <span className="mt-1 block text-small font-normal text-fg-secondary">
            {note}
          </span>
        )}
      </legend>
      {children}
    </fieldset>
  );
}

export function JoiningForm({
  app,
  onDone,
}: {
  app: MyApplication;
  onDone?: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const j = app.joining_details;
  const form = useForm<JoiningFormValues, unknown, JoiningInput>({
    resolver: zodResolver(joiningSchema),
    mode: "onTouched",
    defaultValues: j
      ? {
          date_of_birth: j.date_of_birth,
          aadhaar_number: grouped(j.aadhaar_number),
          pan_number: j.pan_number,
          uan_number: j.uan_number ?? "",
          bank_account_holder: j.bank_account_holder,
          bank_account_number: j.bank_account_number,
          bank_ifsc: j.bank_ifsc,
          address: j.address,
          emergency_contact_name: j.emergency_contact_name,
          emergency_contact_phone: formatPhone(j.emergency_contact_phone),
          preferred_joining_date: j.preferred_joining_date,
        }
      : { bank_account_holder: app.full_name },
  });
  const e = form.formState.errors;
  const reg = form.register;

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await submitJoiningDetails(app.candidate_id, v);
      await queryClient.invalidateQueries({
        queryKey: candidateKeys.one(app.candidate_id),
      });
      await queryClient.invalidateQueries({ queryKey: candidateKeys.mine });
      toast.success(
        "Details sent to HR. Check your inbox for a confirmation (demo).",
      );
      onDone?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(friendlyError(err));
    }
  });

  const resubmit = !!j;
  return (
    <Card className="p-5">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Group title="About you">
          <Field label="Date of birth" error={e.date_of_birth?.message}>
            <Input type="date" max={isoDay(0)} {...reg("date_of_birth")} />
          </Field>
          <Field
            label="Current address"
            hint="Where we'll post your appointment letter"
            error={e.address?.message}
          >
            <Textarea
              rows={3}
              autoComplete="street-address"
              {...reg("address")}
            />
          </Field>
        </Group>
        <Group
          title="ID numbers"
          note="Type the numbers only. No photos or uploads."
        >
          <Field
            label="Aadhaar number"
            hint="12 digits. Spaces are fine"
            error={e.aadhaar_number?.message}
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              {...reg("aadhaar_number")}
            />
          </Field>
          <Field
            label="PAN"
            hint="10 characters, as on your PAN card"
            error={e.pan_number?.message}
          >
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="uppercase"
              {...reg("pan_number")}
            />
          </Field>
          <Field
            label="UAN (optional)"
            hint="Only if you've had PF before. 12 digits"
            error={e.uan_number?.message}
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              {...reg("uan_number")}
            />
          </Field>
        </Group>
        <Group title="Bank account for salary">
          <Field
            label="Account holder name"
            hint="Exactly as in your passbook"
            error={e.bank_account_holder?.message}
          >
            <Input {...reg("bank_account_holder")} />
          </Field>
          <Field
            label="Account number"
            hint="9 to 18 digits"
            error={e.bank_account_number?.message}
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              {...reg("bank_account_number")}
            />
          </Field>
          <Field
            label="IFSC"
            hint="11 characters, like HDFC0001234"
            error={e.bank_ifsc?.message}
          >
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="uppercase"
              {...reg("bank_ifsc")}
            />
          </Field>
        </Group>
        <Group title="Emergency contact">
          <Field
            label="Contact name"
            hint="Someone we can call in an emergency"
            error={e.emergency_contact_name?.message}
          >
            <Input {...reg("emergency_contact_name")} />
          </Field>
          <Field
            label="Contact mobile"
            hint="10 digits"
            error={e.emergency_contact_phone?.message}
          >
            <Input
              type="tel"
              inputMode="tel"
              {...reg("emergency_contact_phone")}
            />
          </Field>
        </Group>
        <Group title="Joining">
          <Field
            label="Preferred joining date"
            hint="Any day in the next 90 days"
            error={e.preferred_joining_date?.message}
          >
            <Input
              type="date"
              min={isoDay(0)}
              max={isoDay(90)}
              {...reg("preferred_joining_date")}
            />
          </Field>
        </Group>
        {error && <FieldError>{error}</FieldError>}
        <Button
          type="submit"
          loading={form.formState.isSubmitting}
          className="w-full"
        >
          {resubmit ? "Resubmit details" : "Submit joining details"}
        </Button>
        <p className="text-small text-fg-secondary">
          You can edit these until HR marks you onboarded.
        </p>
      </form>
    </Card>
  );
}

function Summary({ j }: { j: JoiningDetails }) {
  const rows: Array<[string, ReactNode]> = [
    ["Date of birth", longDate(j.date_of_birth)],
    [
      "Aadhaar",
      <MaskedValue value={j.aadhaar_number} label="Aadhaar number" />,
    ],
    ["PAN", <MaskedValue value={j.pan_number} label="PAN" />],
    [
      "UAN",
      j.uan_number ? (
        <MaskedValue value={j.uan_number} label="UAN" />
      ) : (
        "Not provided"
      ),
    ],
    ["Account holder", j.bank_account_holder],
    [
      "Account number",
      <MaskedValue value={j.bank_account_number} label="account number" />,
    ],
    ["IFSC", <span className="font-mono text-mono">{j.bank_ifsc}</span>],
    ["Address", j.address],
    [
      "Emergency contact",
      `${j.emergency_contact_name} · ${formatPhone(j.emergency_contact_phone)}`,
    ],
    ["Joining date", longDate(j.preferred_joining_date)],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-small leading-[22px] text-fg-secondary">{k}</dt>
          <dd className="min-w-0 text-right break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Everything after "selected" on the candidate's application page. */
export function JoiningSection({ app }: { app: MyApplication }) {
  const [editing, setEditing] = useState(false);
  const j = app.joining_details;
  const name = firstName(app.full_name);

  if (app.status === "onboarded")
    return (
      <Banner
        tone="success"
        title={`You're all set, ${name}. Welcome to Naman Foods`}
      >
        {j && <>Your joining date is {longDate(j.preferred_joining_date)}. </>}
        HR will send your day-one instructions.
      </Banner>
    );

  if (app.status === "details_submitted" && !editing && j)
    return (
      <>
        <Banner tone="success" title="Submitted. HR is reviewing your details">
          HR usually reviews them within 2 working days. We'll email and text
          you when you're cleared to join.
        </Banner>
        <Card className="p-4">
          <h2 className="mb-3 text-title">What you sent</h2>
          <Summary j={j} />
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden className="size-4" /> Edit details
          </Button>
        </Card>
      </>
    );

  return (
    <>
      {j?.changes_requested_reason && app.status === "selected" ? (
        <Banner tone="warning" title="HR asked you to fix one thing">
          “{j.changes_requested_reason}”
        </Banner>
      ) : !editing ? (
        <div className="rounded-lg border border-accent-soft-strong bg-surface-brand p-5">
          <h2 className="text-heading">You're selected, {name}.</h2>
          <p className="mt-2 text-body">
            Welcome to Naman Foods. One last step: share your joining details so
            HR can prepare your appointment letter.
          </p>
          <p className="mt-2 text-small text-accent-default">
            About 5 minutes · nothing to upload
          </p>
        </div>
      ) : null}
      <JoiningForm app={app} onDone={() => setEditing(false)} />
    </>
  );
}
