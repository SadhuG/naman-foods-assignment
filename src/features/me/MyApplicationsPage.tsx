import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Banner } from "../../components/ui/Banner";
import { Card, Overline } from "../../components/ui/Brand";
import { cn } from "../../components/ui/cn";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { StatusChip } from "../../components/ui/StatusChip";
import { candidateKeys, listMyApplications } from "../../lib/api/candidate";
import { friendlyError } from "../../lib/api/errors";
import { firstName } from "../../lib/copy";
import type { MyApplicationSummary } from "../../lib/types";
import { CandidateShell, useDisplayName } from "./CandidateShell";

const city = (location: string) => location.split(",")[0]!.trim();

function nextLine(a: MyApplicationSummary): string {
  switch (a.status) {
    case "active":
      return a.next_round_name
        ? `Next: ${a.next_round_name}`
        : "Last round. A decision comes next.";
    case "on_hold":
      return "On hold. HR will get back to you.";
    case "rejected":
      return "This application has closed.";
    case "selected":
      return "Next: share your joining details.";
    case "details_submitted":
      return "Details sent. HR is checking them.";
    case "onboarded":
      return "You're onboarded. Welcome to Naman Foods!";
  }
}

export function RoundBar({ a }: { a: MyApplicationSummary }) {
  const finished = ["selected", "details_submitted", "onboarded"].includes(
    a.status,
  );
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: a.total_rounds }, (_, i) => {
        const p = i + 1;
        const tone =
          finished || p < a.current_round
            ? "bg-status-selected-fg"
            : p === a.current_round
              ? a.status === "on_hold"
                ? "bg-status-on_hold-fg"
                : a.status === "rejected"
                  ? "bg-status-rejected-fg"
                  : "bg-accent-default"
              : "bg-border-default";
        return <span key={p} className={cn("h-1 flex-1 rounded-full", tone)} />;
      })}
    </div>
  );
}

export default function MyApplicationsPage() {
  const name = useDisplayName();
  const apps = useQuery({
    queryKey: candidateKeys.mine,
    queryFn: listMyApplications,
  });

  return (
    <CandidateShell>
      <h1 className="text-display">My applications</h1>
      <p className="mt-3 text-body text-fg-secondary">
        Hi {firstName(name)}. Here's where each application stands.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        {apps.isPending ? (
          <PageSpinner />
        ) : apps.isError ? (
          <Banner tone="danger" title="We couldn't load your applications.">
            {friendlyError(apps.error)}
          </Banner>
        ) : apps.data.length === 0 ? (
          <Card>
            <EmptyState
              icon={BriefcaseBusiness}
              title="No applications yet"
              body="Ask HR for a drive link. Once you apply, every round shows up here."
            />
          </Card>
        ) : (
          apps.data.map((a) => (
            <Link
              key={a.candidate_id}
              to={`/me/applications/${a.candidate_id}`}
              className="group block rounded-lg border border-border-default bg-surface-raised p-4 hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Overline className="text-fg-secondary">
                    Naman Foods · {city(a.location)}
                  </Overline>
                  <h2 className="mt-2 text-title">{a.drive_title}</h2>
                </div>
                <StatusChip status={a.status} />
              </div>
              <div className="mt-3">
                <RoundBar a={a} />
              </div>
              <p className="mt-3 text-body">
                Round {a.current_round} of {a.total_rounds}
                {a.current_round_name && ` · ${a.current_round_name}`}
              </p>
              <div className="mt-1 flex items-center justify-between gap-3 text-small text-fg-secondary">
                <span>{nextLine(a)}</span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 group-hover:text-fg-primary"
                />
              </div>
            </Link>
          ))
        )}
      </div>
    </CandidateShell>
  );
}
