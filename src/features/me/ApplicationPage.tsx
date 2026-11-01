import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Banner } from "../../components/ui/Banner";
import { Card, Overline } from "../../components/ui/Brand";
import { buttonClass } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { StatusChip } from "../../components/ui/StatusChip";
import { candidateKeys, getMyApplication } from "../../lib/api/candidate";
import { friendlyError } from "../../lib/api/errors";
import { formatPhone, shortDate, years } from "../../lib/copy";
import { supabase } from "../../lib/supabase";
import type { MyApplication } from "../../lib/types";
import { CandidateShell } from "./CandidateShell";
import { buildTimeline, latestNote } from "./progress";
import { StatusTimeline } from "./StatusTimeline";

async function getProfile(id: string) {
  const { data, error } = await supabase
    .from("candidates")
    .select("email, phone, city, qualification, experience_years")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Slot below the timeline once a candidate is selected. Phase 08 fills it with the joining form. */
export function SelectedSlot({ app }: { app: MyApplication }): ReactNode {
  return (
    <Banner tone="success" title="You've been selected">
      Next, share your joining details with the Naman Foods HR team.
      {app.joining_details ? " Your details are with HR." : ""}
    </Banner>
  );
}

export default function ApplicationPage() {
  const { id = "" } = useParams();
  const app = useQuery({
    queryKey: candidateKeys.one(id),
    queryFn: () => getMyApplication(id),
    retry: false,
  });
  const profile = useQuery({
    queryKey: [...candidateKeys.one(id), "profile"],
    queryFn: () => getProfile(id),
    enabled: app.isSuccess,
  });

  const back = (
    <Link
      to="/me"
      className="mb-4 inline-flex items-center gap-1 text-label text-fg-link hover:underline"
    >
      <ChevronLeft aria-hidden className="size-4" /> My applications
    </Link>
  );

  if (app.isPending)
    return (
      <CandidateShell>
        {back}
        <PageSpinner />
      </CandidateShell>
    );
  if (app.isError)
    return (
      <CandidateShell>
        {back}
        <Card>
          <EmptyState
            icon={SearchX}
            title={friendlyError(app.error)}
            body="It may belong to another account. Your own applications are listed under My applications."
            action={
              <Link to="/me" className={buttonClass("secondary")}>
                My applications
              </Link>
            }
          />
        </Card>
      </CandidateShell>
    );

  const a = app.data;
  const steps = buildTimeline(a);
  const note = latestNote(a);
  const p = profile.data;
  const selected = ["selected", "details_submitted", "onboarded"].includes(
    a.status,
  );

  return (
    <CandidateShell>
      {back}
      <Overline>Naman Foods · {a.drive.location.split(",")[0]}</Overline>
      <h1 className="mt-2 text-heading">{a.drive.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusChip status={a.status} />
        <span className="text-small text-fg-secondary">
          Applied {shortDate(a.applied_at)} · Round {a.current_round} of{" "}
          {a.rounds.length}
        </span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {selected && <SelectedSlot app={a} />}
        <Card className="p-4">
          <h2 className="mb-4 text-title">Your progress</h2>
          <StatusTimeline steps={steps} />
        </Card>

        {note && (
          <figure className="rounded-md bg-surface-brand px-4 py-3">
            <figcaption className="text-small text-accent-default">
              Latest note from the hiring team
            </figcaption>
            <blockquote className="mt-1 text-[15px] leading-6">
              {note}
            </blockquote>
          </figure>
        )}

        {p && (
          <Card className="p-4">
            <h2 className="mb-3 text-title">Your details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-body">
              {(
                [
                  ["Email", p.email],
                  ["Mobile", formatPhone(p.phone)],
                  ["City", p.city],
                  ["Qualification", p.qualification],
                  ["Experience", years(Number(p.experience_years))],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-small text-fg-secondary">{k}</dt>
                  <dd className="min-w-0 truncate text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>
    </CandidateShell>
  );
}
