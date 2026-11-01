import { useQuery } from "@tanstack/react-query";
import { Check, Pause, RotateCcw, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Banner } from "../../components/ui/Banner";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Dialog";
import { PageSpinner } from "../../components/ui/Spinner";
import { StatusChip } from "../../components/ui/StatusChip";
import { cn } from "../../components/ui/cn";
import {
  getCandidateDetail,
  pipelineKeys,
  type CandidateDetail,
} from "../../lib/api/candidates";
import { friendlyError } from "../../lib/api/errors";
import { formatPhone, shortDate, years } from "../../lib/copy";
import { allowedDecisions, DECISION_LABEL } from "../../lib/pipeline";
import type { Decision, Drive, DriveRound } from "../../lib/types";
import { DecisionDialog } from "./DecisionDialog";
import { describeMoveFor, useDecide } from "./useDecide";

const DECISION_ICON: Record<Decision, [typeof Check, string]> = {
  approved: [Check, "bg-status-selected-bg text-status-selected-fg"],
  on_hold: [Pause, "bg-status-on_hold-bg text-status-on_hold-fg"],
  rejected: [X, "bg-status-rejected-bg text-status-rejected-fg"],
  reopened: [RotateCcw, "bg-status-active-bg text-status-active-fg"],
};
const DECISION_PAST: Record<Decision, string> = {
  approved: "approved",
  on_hold: "put on hold",
  rejected: "rejected",
  reopened: "reopened",
};

export function DrawerSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border-default pt-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-title">{title}</h3>
        {aside && <span className="text-small text-fg-secondary">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function DefinitionList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2 text-body">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-small leading-[22px] text-fg-secondary">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function History({
  detail,
  rounds,
}: {
  detail: CandidateDetail;
  rounds: DriveRound[];
}) {
  const { decisions } = detail;
  if (decisions.length === 0)
    return <p className="text-small text-fg-secondary">No decisions yet.</p>;
  return (
    <ol>
      {decisions.map((d, i) => {
        const [Icon, tone] = DECISION_ICON[d.decision];
        const toSelected =
          d.decision === "approved" && d.round_position === rounds.length;
        return (
          <li key={d.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full",
                  tone,
                )}
              >
                <Icon aria-hidden className="size-3.5" />
              </span>
              {i < decisions.length - 1 && (
                <span className="my-1 w-0.5 flex-1 bg-border-default" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-body">
                  {d.round_name} · {DECISION_PAST[d.decision]}
                  {toSelected && " → Selected"}
                </p>
                <span className="shrink-0 font-mono text-small text-fg-secondary">
                  {shortDate(d.decided_at)}
                </span>
              </div>
              {d.note && (
                <p className="mt-0.5 text-small text-fg-secondary">
                  <span className="text-fg-primary">Internal note:</span>{" "}
                  {d.note}
                </p>
              )}
              {d.candidate_message && (
                <p className="mt-0.5 text-small text-fg-secondary">
                  <span className="text-fg-primary">Message sent:</span> “
                  {d.candidate_message}”
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function CandidateDrawer({
  id,
  drive,
  rounds,
  onClose,
}: {
  id: string | null;
  drive: Drive;
  rounds: DriveRound[];
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: pipelineKeys.detail(id ?? ""),
    queryFn: () => getCandidateDetail(id!),
    enabled: !!id,
  });
  const run = useDecide(drive.id, rounds);
  const [dialog, setDialog] = useState<Decision | null>(null);
  const d = detail.data;
  const c = d?.candidate;
  const actions = c ? allowedDecisions(c.status) : [];

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      size="lg"
      title={c?.full_name ?? "Candidate"}
      description={
        c && (
          <span className="flex flex-col gap-2">
            <span>
              {drive.title} · applied {shortDate(c.created_at)} · {c.email}
            </span>
            <span className="flex items-center gap-2">
              <StatusChip status={c.status} />
              <span className="rounded-sm bg-surface-sunken px-2 py-0.5 text-small">
                {c.user_id ? "Has account" : "Added by HR"}
              </span>
            </span>
          </span>
        )
      }
      footer={
        c &&
        actions.length > 0 && (
          <>
            {actions
              .filter((a) => a !== "approved")
              .map((a) => (
                <Button
                  key={a}
                  variant={a === "rejected" ? "danger" : "secondary"}
                  onClick={() => setDialog(a)}
                >
                  {DECISION_LABEL[a]}
                </Button>
              ))}
            {actions.includes("approved") && (
              <Button onClick={() => setDialog("approved")}>
                {DECISION_LABEL.approved}
              </Button>
            )}
          </>
        )
      }
    >
      {detail.isPending ? (
        <PageSpinner />
      ) : detail.isError ? (
        <Banner tone="danger" title={friendlyError(detail.error)} />
      ) : (
        <div className="flex flex-col gap-6">
          <DrawerSection title="Decisions" aside="Internal notes are HR-only">
            <History detail={d!} rounds={rounds} />
          </DrawerSection>
          <DrawerSection title="Profile">
            <DefinitionList
              rows={[
                [
                  "Mobile",
                  <span className="font-mono text-mono">
                    {formatPhone(c!.phone)}
                  </span>,
                ],
                ["City", c!.city],
                ["Qualification", c!.qualification],
                ["Experience", years(Number(c!.experience_years))],
                [
                  "Current round",
                  `${c!.current_round} of ${rounds.length} · ${rounds.find((r) => r.position === c!.current_round)?.name ?? ""}`,
                ],
              ]}
            />
          </DrawerSection>
        </div>
      )}
      {c && dialog && (
        <DecisionDialog
          open
          onClose={() => setDialog(null)}
          decision={dialog}
          candidates={[c]}
          describeMove={describeMoveFor([c], rounds)}
          onConfirm={async (dec, note, msg) => {
            await run([c], dec, note, msg);
          }}
        />
      )}
    </Drawer>
  );
}
