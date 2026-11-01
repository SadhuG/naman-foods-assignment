import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { loadExportInput } from "../../lib/api/export";
import { friendlyError } from "../../lib/api/errors";
import { csvFilename, csvLabel, downloadCsv, toCsv } from "../../lib/csv";
import {
  buildCandidateRows,
  buildDecisionLog,
  buildFullReport,
  buildMessageLog,
  type ExportInput,
  type Table,
} from "../../lib/exportRows";
import type { Candidate, Drive } from "../../lib/types";

export type ExportKind =
  "stage" | "selected" | "full" | "decisions" | "messages";

/** Builds and downloads one export. Loads fresh data so files match the database. */
export async function runExport(
  drive: Drive,
  kind: ExportKind,
  opts: { stageLabel?: string; rows?: Candidate[]; input?: ExportInput } = {},
) {
  try {
    const input = opts.input ?? (await loadExportInput(drive.id));
    const ids = new Set((opts.rows ?? []).map((c) => c.id));
    // Use fresh rows for the chosen people, in the order shown.
    const chosen = input.candidates.filter((c) => ids.has(c.id));
    let table: Table;
    let label: string;
    switch (kind) {
      case "stage":
        table = buildCandidateRows(input, chosen);
        label = csvLabel(opts.stageLabel ?? "stage");
        break;
      case "selected":
        table = buildCandidateRows(input, chosen);
        label = "selected-rows";
        break;
      case "full":
        table = buildFullReport(input);
        label = "full-report";
        break;
      case "decisions":
        table = buildDecisionLog(input);
        label = "decision-log";
        break;
      case "messages":
        table = buildMessageLog(input);
        label = "message-log";
        break;
    }
    const name = csvFilename(drive.slug, label, new Date());
    downloadCsv(name, toCsv(table.headers, table.rows));
    toast.success(`Downloaded ${name} (${table.rows.length} rows)`);
  } catch (e) {
    toast.error(friendlyError(e));
  }
}

/** "Export CSV" menu in the pipeline header (Figma "Export menu"). */
export function ExportMenu({
  drive,
  stageLabel,
  stageRows,
  selected,
}: {
  drive: Drive;
  stageLabel: string;
  stageRows: Candidate[];
  selected: Candidate[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportKind | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const data = useQuery({
    queryKey: ["export-input", drive.id],
    queryFn: () => loadExportInput(drive.id),
    enabled: open,
    staleTime: 0,
  });

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      } else if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const d = data.data;
  const names = (cs: Candidate[]) =>
    cs.length <= 3
      ? cs.map((c) => c.full_name).join(", ")
      : `${cs
          .slice(0, 2)
          .map((c) => c.full_name)
          .join(", ")} and ${cs.length - 2} others`;
  const items: Array<{
    kind: ExportKind;
    title: string;
    note: string;
    rows: Candidate[] | undefined;
    hidden?: boolean;
  }> = [
    {
      kind: "stage",
      title: `This stage · ${stageRows.length} ${stageRows.length === 1 ? "candidate" : "candidates"}`,
      note: `${stageLabel}, with your search and filters`,
      rows: stageRows,
    },
    {
      kind: "selected",
      title: `Selected rows · ${selected.length}`,
      note: names(selected),
      rows: selected,
      hidden: selected.length === 0,
    },
    {
      kind: "full",
      title: `Full report · ${d ? d.candidates.length : "…"} candidates`,
      note: "Every stage, decision and joining detail. Includes ID and bank numbers",
      rows: undefined,
    },
    {
      kind: "decisions",
      title: `Decision log · ${d ? d.decisions.length : "…"} decisions`,
      note: "Who decided what and when, plus HR notes",
      rows: undefined,
    },
    {
      kind: "messages",
      title: `Message log · ${d ? d.messages.length : "…"} messages`,
      note: "Every mock email and SMS for this drive",
      rows: undefined,
    },
  ];

  return (
    <div ref={box} className="relative">
      <Button
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Download aria-hidden className="size-4" /> Export CSV
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Download as CSV"
          className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-border-default bg-surface-raised p-1.5 shadow-xl"
        >
          <p className="px-3 pt-2 pb-1 font-mono text-caption text-fg-secondary uppercase">
            Download as CSV
          </p>
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <button
                key={i.kind}
                role="menuitem"
                disabled={
                  busy !== null ||
                  (i.kind === "stage" && stageRows.length === 0)
                }
                onClick={async () => {
                  setBusy(i.kind);
                  await runExport(drive, i.kind, {
                    stageLabel,
                    rows: i.rows,
                    input: d,
                  });
                  setBusy(null);
                  setOpen(false);
                }}
                className="flex w-full gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-sunken disabled:opacity-50"
              >
                {busy === i.kind ? (
                  <Spinner className="mt-0.5 text-fg-secondary" />
                ) : (
                  <Download
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-fg-secondary"
                  />
                )}
                <span className="min-w-0">
                  <span className="block text-label">{i.title}</span>
                  <span className="block truncate text-small text-fg-secondary">
                    {i.note}
                  </span>
                </span>
              </button>
            ))}
          <p className="mt-1 border-t border-border-default px-3 pt-2 pb-1.5 text-small text-fg-secondary">
            Opens in Excel and Google Sheets. Cells starting with = + - @ are
            made safe.
          </p>
        </div>
      )}
    </div>
  );
}
