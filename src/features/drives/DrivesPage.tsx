import { useQuery } from "@tanstack/react-query";
import { QueryError } from "../../components/ui/QueryError";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { Link } from "react-router";
import { buttonClass } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import {
  driveKeys,
  listDrives,
  type DriveListItem,
} from "../../lib/api/drives";
import { plural, timeAgo } from "../../lib/copy";
import { HrShell } from "../hr/HrShell";
import { DriveCard } from "./DriveCard";

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-surface-raised p-5">
      <p className="text-small text-fg-secondary">{label}</p>
      <p className="mt-1 text-[32px] leading-10 font-semibold tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-small text-fg-secondary">{note}</p>
    </div>
  );
}

function Stats({ drives }: { drives: DriveListItem[] }) {
  const sum = (
    k: "active" | "on_hold" | "selected" | "details_submitted" | "onboarded",
  ) => drives.reduce((n, d) => n + d.summary[k], 0);
  const selected =
    sum("selected") + sum("details_submitted") + sum("onboarded");
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat
        label="Waiting on you"
        value={sum("active")}
        note={`in active rounds, across ${drives.length === 2 ? "both drives" : plural(drives.length, "drive")}`}
      />
      <Stat label="On hold" value={sum("on_hold")} note="need a decision" />
      <Stat
        label="Selected"
        value={selected}
        note={`${sum("selected")} still owe joining details`}
      />
      <Stat
        label="Onboarded"
        value={sum("onboarded")}
        note={`of the ${selected} selected`}
      />
    </div>
  );
}

export default function DrivesPage() {
  const drives = useQuery({ queryKey: driveKeys.all, queryFn: listDrives });
  const list = drives.data ?? [];
  const open = list.filter((d) => d.status === "open");
  const closed = list.filter((d) => d.status === "closed");
  const total = list.reduce((n, d) => n + d.summary.total, 0);
  const last = list
    .map((d) => d.lastChange)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <HrShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Drives</h1>
          {drives.data && (
            <p className="mt-1 text-body text-fg-secondary">
              {plural(open.length, "open drive")} · {plural(total, "candidate")}
              {last && ` · last change ${timeAgo(last)}`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to="/drives/new" className={buttonClass("primary")}>
            <Plus aria-hidden className="size-4" /> New drive
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {drives.isPending ? (
          <PageSpinner />
        ) : drives.isError ? (
          <QueryError
            title="We couldn't load the drives."
            error={drives.error}
            onRetry={() => drives.refetch()}
          />
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-border-default bg-surface-raised">
            <EmptyState
              icon={BriefcaseBusiness}
              title="No drives yet"
              body="Create a drive, pick its interview rounds, then share the link or QR code with candidates."
              action={
                <Link to="/drives/new" className={buttonClass("primary")}>
                  <Plus aria-hidden className="size-4" /> New drive
                </Link>
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <Stats drives={list} />
            {[
              ["Open drives", open],
              ["Closed drives", closed],
            ].map(
              ([title, items]) =>
                (items as DriveListItem[]).length > 0 && (
                  <section key={title as string} aria-label={title as string}>
                    <h2 className="mb-4 text-title">{title as string}</h2>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {(items as DriveListItem[]).map((d) => (
                        <DriveCard key={d.id} d={d} />
                      ))}
                    </div>
                  </section>
                ),
            )}
          </div>
        )}
      </div>
    </HrShell>
  );
}
