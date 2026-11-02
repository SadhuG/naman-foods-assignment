import { zodResolver } from "@hookform/resolvers/zod";
import { QueryError } from "../../components/ui/QueryError";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Button, buttonClass } from "../../components/ui/Button";
import {
  Field,
  FieldError,
  Input,
  Select,
  Textarea,
} from "../../components/ui/Field";
import { PageSpinner } from "../../components/ui/Spinner";
import {
  createDrive,
  driveKeys,
  getDrive,
  updateDrive,
} from "../../lib/api/drives";
import { friendlyError } from "../../lib/api/errors";
import { DEFAULT_ROUNDS, driveSchema, type DriveInput } from "../../lib/drives";
import type { Drive, DriveRound } from "../../lib/types";
import { Breadcrumbs, HrShell } from "../hr/HrShell";
import { RoundsEditor } from "./RoundsEditor";
import { ShareDrive } from "./ShareDrive";

// The form keeps rounds as objects (react-hook-form field arrays need them).
const formSchema = driveSchema.extend({
  status: z.enum(["open", "closed"]),
  rounds: z
    .array(z.object({ name: z.string() }))
    .transform((rs) => rs.map((r) => r.name))
    .pipe(driveSchema.shape.rounds),
});
export type DriveFormShape = z.input<typeof formSchema>;
export type DriveFormOutput = z.output<typeof formSchema>;

const blank: DriveFormShape = {
  title: "",
  role: "",
  location: "Bhiwadi, Rajasthan",
  openings: 1,
  description: "",
  status: "open",
  rounds: DEFAULT_ROUNDS.map((name) => ({ name })),
};

export function NewDrivePage() {
  return <DriveEditor />;
}

export function EditDrivePage() {
  const { id = "" } = useParams();
  const q = useQuery({
    queryKey: driveKeys.one(id),
    queryFn: () => getDrive(id),
  });
  if (q.isPending)
    return (
      <HrShell>
        <PageSpinner />
      </HrShell>
    );
  if (q.isError)
    return (
      <HrShell>
        <QueryError error={q.error} onRetry={() => q.refetch()}>
          <Link to="/drives" className="text-label text-fg-link underline">
            Back to drives
          </Link>
        </QueryError>
      </HrShell>
    );
  return <DriveEditor existing={q.data} />;
}

function DriveEditor({
  existing,
}: {
  existing?: { drive: Drive; rounds: DriveRound[]; candidateCount: number };
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const locked = (existing?.candidateCount ?? 0) > 0;
  const d = existing?.drive;
  const form = useForm<DriveFormShape, unknown, DriveFormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: d
      ? {
          title: d.title,
          role: d.role,
          location: d.location,
          openings: d.openings,
          description: d.description,
          status: d.status,
          rounds: existing!.rounds.map((r) => ({ name: r.name })),
        }
      : blank,
  });
  const e = form.formState.errors;

  const save = useMutation({
    mutationFn: async (v: DriveFormOutput) => {
      const { status, ...input } = v;
      if (d) {
        await updateDrive(d.id, input as DriveInput, status);
        return d.id;
      }
      return (await createDrive(input as DriveInput, status)).id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: driveKeys.all });
      await queryClient.invalidateQueries({ queryKey: driveKeys.one(id) });
      queryClient.removeQueries({ queryKey: ["public-drive"] });
      toast.success(
        d ? "Drive saved." : "Drive created. Share the link or QR code.",
      );
      navigate(d ? `/drives/${id}` : `/drives/${id}/edit`);
    },
    onError: (err) => setError(friendlyError(err)),
  });

  const title = d ? `Edit ${d.title}` : "New drive";
  const submit = form.handleSubmit((v) => {
    setError(null);
    save.mutate(v);
  });

  return (
    <HrShell>
      <Breadcrumbs
        items={[
          ["Drives", "/drives"],
          ...(d ? [[d.title, `/drives/${d.id}`] as [string, string]] : []),
          [d ? "Edit" : "New drive"],
        ]}
      />
      <form onSubmit={submit} noValidate>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display">{title}</h1>
            <p className="mt-1 text-body text-fg-secondary">
              Set up the role and its interview rounds. You get a link and a QR
              code to share.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to={d ? `/drives/${d.id}` : "/drives"}
              className={buttonClass("ghost")}
            >
              Cancel
            </Link>
            <Button type="submit" loading={save.isPending}>
              {d ? "Save changes" : "Create drive"}
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-4">
            <FieldError>{error}</FieldError>
          </div>
        )}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-lg border border-border-default bg-surface-raised p-5">
              <h2 className="mb-4 text-title">Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Drive title"
                  hint="Candidates see this first"
                  error={e.title?.message}
                  className="md:col-span-2"
                >
                  <Input {...form.register("title")} />
                </Field>
                <Field
                  label="Role"
                  hint="The job title on offer letters"
                  error={e.role?.message}
                >
                  <Input {...form.register("role")} />
                </Field>
                <Field
                  label="Location"
                  hint="Plant or office"
                  error={e.location?.message}
                >
                  <Input {...form.register("location")} />
                </Field>
                <Field
                  label="Openings"
                  hint="How many people you plan to hire"
                  error={e.openings?.message}
                >
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    {...form.register("openings", {
                      setValueAs: (v) => (v === "" ? undefined : Number(v)),
                    })}
                  />
                </Field>
                <Field label="Status" hint="Closed drives show a 'closed' page">
                  <Select {...form.register("status")}>
                    <option value="open">Open — taking applications</option>
                    <option value="closed">
                      Closed — not taking applications
                    </option>
                  </Select>
                </Field>
                <Field
                  label="Description"
                  hint="Pay, shifts and benefits help people decide"
                  error={e.description?.message}
                  className="md:col-span-2"
                >
                  <Textarea rows={3} {...form.register("description")} />
                </Field>
              </div>
            </section>
            <RoundsEditor
              control={form.control}
              register={form.register}
              errors={e}
              locked={locked}
            />
          </div>
          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <ShareDrive slug={d?.slug ?? null} />
            <div className="rounded-md bg-surface-brand px-4 py-3">
              <p className="text-small text-accent-default">
                What candidates see
              </p>
              <p className="mt-1 text-small">
                Your title, description and rounds, then a 3-minute form. No
                uploads.
              </p>
            </div>
          </div>
        </div>
      </form>
    </HrShell>
  );
}
