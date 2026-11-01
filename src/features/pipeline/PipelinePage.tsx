import { useQuery } from "@tanstack/react-query";
import { QueryError } from "../../components/ui/QueryError";
import { Filter, Link2, Mail, Pencil, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { Button, buttonClass } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { Tabs } from "../../components/ui/Tabs";
import { cn } from "../../components/ui/cn";
import {
  listChangeRequests,
  listCandidates,
  pipelineKeys,
  useCandidatesLive,
} from "../../lib/api/candidates";
import { driveKeys, getDrive } from "../../lib/api/drives";
import { plural, shortDate } from "../../lib/copy";
import {
  allowedDecisions,
  countByStage,
  filterByStage,
  matchesSearch,
} from "../../lib/pipeline";
import { joiningProgressLabel } from "../../lib/schemas";
import type { Candidate, Decision, StageKey } from "../../lib/types";
import { ExportMenu, runExport } from "../export/ExportMenu";
import { ShareDrive } from "../drives/ShareDrive";
import { Breadcrumbs, HrShell } from "../hr/HrShell";
import { BulkBar } from "./BulkBar";
import { CandidateDrawer } from "./CandidateDrawer";
import { CandidateTable } from "./CandidateTable";
import { DecisionDialog } from "./DecisionDialog";
import { decisionPreview } from "./DecisionPreview";
import { approveTarget, describeMoveFor, useDecide } from "./useDecide";

const ORDER: Decision[] = ["approved", "on_hold", "rejected", "reopened"];

export default function PipelinePage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const drive = useQuery({
    queryKey: driveKeys.one(id),
    queryFn: () => getDrive(id),
  });
  const people = useQuery({
    queryKey: pipelineKeys.list(id),
    queryFn: () => listCandidates(id),
  });
  useCandidatesLive(id);
  const stageParam = params.get("stage") ?? "round-1";
  const changes = useQuery({
    queryKey: ["change-requests", id, people.dataUpdatedAt],
    queryFn: () => listChangeRequests(id),
    enabled: stageParam === "selected",
  });

  const stage = (params.get("stage") ?? "round-1") as StageKey;
  const openId = params.get("c");
  const [q, setQ] = useState("");
  const [holdOnly, setHoldOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Decision | null>(null);
  const [share, setShare] = useState(false);
  const fresh = useFreshIds(people.data);

  const rounds = drive.data?.rounds ?? [];
  const all = people.data ?? [];
  const counts = useMemo(() => countByStage(all, rounds), [all, rounds]);
  const isRound = stage.startsWith("round-");
  const inStage = filterByStage(all, stage);
  const onHoldHere = inStage.filter((c) => c.status === "on_hold").length;
  const rows = inStage.filter(
    (c) =>
      matchesSearch(c, q) && (!holdOnly || !isRound || c.status === "on_hold"),
  );
  const chosen = all.filter((c) => selected.has(c.id));
  const actions = ORDER.filter((d) =>
    chosen.some((c) => allowedDecisions(c.status).includes(d)),
  ).filter((d) => d !== "reopened" || stage === "rejected" || stage === "all");
  const run = useDecide(id, rounds);

  // Selection belongs to a tab.
  useEffect(() => {
    setSelected(new Set());
    setHoldOnly(false);
  }, [stage]);
  // Drop ids that left the current view (decided, or filtered out).
  const visible = new Set(rows.map((r) => r.id));
  useEffect(() => {
    setSelected((s) => {
      const next = new Set([...s].filter((x) => visible.has(x)));
      return next.size === s.size ? s : next;
    });
  }, [rows.map((r) => r.id).join()]);

  const setParam = (k: string, v: string | null) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (v === null) n.delete(k);
        else n.set(k, v);
        return n;
      },
      { replace: k === "stage" },
    );

  if (drive.isPending)
    return (
      <HrShell>
        <PageSpinner />
      </HrShell>
    );
  if (drive.isError)
    return (
      <HrShell>
        <QueryError error={drive.error} onRetry={() => drive.refetch()}>
          <Link to="/" className="text-label text-fg-link underline">
            Back to drives
          </Link>
        </QueryError>
      </HrShell>
    );

  const d = drive.data.drive;
  const tabs = [
    ...rounds.map((r) => ({
      key: `round-${r.position}`,
      label: `${r.position} · ${r.name}`,
      count: counts[`round-${r.position}`],
    })),
    { key: "selected", label: "Selected", count: counts.selected },
    { key: "rejected", label: "Rejected", count: counts.rejected },
    { key: "all", label: "All", count: counts.all },
  ];
  const target = approveTarget(chosen, rounds);

  return (
    <HrShell>
      <Breadcrumbs items={[["Drives", "/"], [d.title]]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">{d.title}</h1>
          <p className="mt-1 text-body text-fg-secondary">
            {plural(all.length, "candidate")} · {d.location.split(",")[0]} ·{" "}
            {plural(d.openings, "opening")} ·{" "}
            {d.status === "open"
              ? `open since ${shortDate(d.created_at)}`
              : "closed"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/drives/${id}/edit`} className={buttonClass("ghost")}>
            <Pencil aria-hidden className="size-4" /> Edit drive
          </Link>
          <Link
            to={`/drives/${id}/outbox`}
            className={buttonClass("secondary")}
          >
            <Mail aria-hidden className="size-4" /> Outbox
          </Link>
          <Button variant="secondary" onClick={() => setShare(true)}>
            <Link2 aria-hidden className="size-4" /> Share link
          </Button>
          <ExportMenu
            drive={d}
            stageLabel={
              tabs.find((t) => t.key === stage)?.label.replace(/^\d+ · /, "") ??
              "Stage"
            }
            stageRows={rows}
            selected={chosen}
          />
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          label="Stages"
          items={tabs}
          value={stage}
          onChange={(k) => setParam("stage", k)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="relative w-80">
          <span className="sr-only">Search name, email or phone</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-secondary"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or phone"
            className="h-10 w-full rounded-md border border-border-strong bg-surface-raised pr-3 pl-9 text-body placeholder:text-fg-secondary focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none"
          />
        </label>
        {isRound && (
          <button
            aria-pressed={holdOnly}
            onClick={() => setHoldOnly((h) => !h)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-label",
              holdOnly
                ? "border-status-on_hold-fg bg-status-on_hold-bg text-status-on_hold-fg"
                : "border-border-strong bg-surface-raised hover:bg-surface-sunken",
            )}
          >
            <Filter aria-hidden className="size-4" /> On hold only ({onHoldHere}
            )
          </button>
        )}
        <p className="ml-auto text-small text-fg-secondary" aria-live="polite">
          {rows.length} {isRound ? "in this round" : "shown"} · newest first
        </p>
      </div>

      <div className="mt-4 pb-24">
        {people.isPending ? (
          <PageSpinner />
        ) : people.isError ? (
          <QueryError error={people.error} onRetry={() => people.refetch()} />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-border-default bg-surface-raised">
            <EmptyState
              icon={Users}
              title={
                q || holdOnly
                  ? "No one matches"
                  : isRound
                    ? "No one in this round yet"
                    : `No one ${stage === "all" ? "has applied" : `is ${stage}`} yet`
              }
              body={
                q || holdOnly
                  ? "Try a different name, email or phone number."
                  : isRound
                    ? stage === "round-1"
                      ? "New applications land here. Share the link or QR code to get started."
                      : "Candidates appear here when you approve them from the previous round."
                    : "Candidates show up here as you make decisions."
              }
              action={
                q || holdOnly ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQ("");
                      setHoldOnly(false);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : stage === "round-1" ? (
                  <Button variant="secondary" onClick={() => setShare(true)}>
                    Share link
                  </Button>
                ) : isRound ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setParam("stage", `round-${Number(stage.slice(6)) - 1}`)
                    }
                  >
                    Go to {rounds[Number(stage.slice(6)) - 2]?.name}
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <CandidateTable
            rows={rows}
            selected={selected}
            fresh={fresh}
            onToggle={(cid) =>
              setSelected((s) => {
                const n = new Set(s);
                if (n.has(cid)) n.delete(cid);
                else n.add(cid);
                return n;
              })
            }
            onToggleAll={(on) =>
              setSelected(on ? new Set(rows.map((r) => r.id)) : new Set())
            }
            onOpen={(cid) => setParam("c", cid)}
            joining={
              stage === "selected"
                ? (c) =>
                    joiningProgressLabel(c.status, !!changes.data?.has(c.id))
                : undefined
            }
          />
        )}
      </div>

      <BulkBar
        count={chosen.length}
        actions={actions}
        approveLabel={
          target === "Selected"
            ? "Approve to Selected"
            : target === "the next round"
              ? "Approve"
              : `Approve to ${target}`
        }
        onAction={setDialog}
        onClear={() => setSelected(new Set())}
        onExport={() => runExport(d, "selected", { rows: chosen })}
      />
      {dialog && (
        <DecisionDialog
          previewSlot={decisionPreview(d, rounds)}
          open
          onClose={() => setDialog(null)}
          decision={dialog}
          options={actions.length > 1 ? actions : undefined}
          candidates={chosen}
          describeMove={describeMoveFor(chosen, rounds)}
          onConfirm={async (dec, note, msg) => {
            await run(chosen, dec, note, msg);
            setSelected(new Set());
          }}
        />
      )}
      <CandidateDrawer
        id={openId}
        drive={d}
        rounds={rounds}
        onClose={() => setParam("c", null)}
      />
      <Dialog
        open={share}
        onClose={() => setShare(false)}
        title="Share this drive"
        description={
          d.status === "closed"
            ? "This drive is closed; the link shows a closed page."
            : undefined
        }
      >
        <ShareDrive slug={d.slug} />
      </Dialog>
    </HrShell>
  );
}

/** Ids that weren't in the previous list, highlighted for a few seconds (live arrivals). */
function useFreshIds(list: Candidate[] | undefined): Set<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!list) return;
    const ids = new Set(list.map((c) => c.id));
    if (seen.current) {
      const added = [...ids].filter((x) => !seen.current!.has(x));
      if (added.length) {
        setFresh(new Set(added));
        const t = setTimeout(() => setFresh(new Set()), 4000);
        seen.current = ids;
        return () => clearTimeout(t);
      }
    }
    seen.current = ids;
  }, [list]);
  return fresh;
}
