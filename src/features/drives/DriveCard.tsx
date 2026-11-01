import { Copy, Link2, Pencil } from "lucide-react";
import { Link } from "react-router";
import { buttonClass } from "../../components/ui/Button";
import { cn } from "../../components/ui/cn";
import type { DriveListItem } from "../../lib/api/drives";
import { shortDate } from "../../lib/copy";
import { copyLink } from "./ShareDrive";

export function DriveStatusChip({ status }: { status: "open" | "closed" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-label",
        status === "open"
          ? "bg-accent-soft text-accent-default"
          : "bg-surface-sunken text-fg-secondary",
      )}
    >
      {status === "open" ? "Open" : "Closed"}
    </span>
  );
}

/** Horizontal bars: people in each round, then selected; rejected in neutral grey below a rule. */
function Funnel({ d }: { d: DriveListItem }) {
  const max = Math.max(1, ...d.funnel.map((r) => r.count));
  return (
    <table className="w-full text-small">
      <caption className="sr-only">Candidates by stage in {d.title}</caption>
      <tbody>
        {d.funnel.map((row) => (
          <tr
            key={row.key}
            className={cn(
              row.kind === "rejected" && "border-t border-border-default",
            )}
          >
            <th
              scope="row"
              className="w-36 py-1.5 pr-3 text-left font-normal text-fg-secondary"
            >
              <Link
                to={`/drives/${d.id}?stage=${row.key}`}
                className="hover:text-fg-primary hover:underline"
              >
                {row.label}
              </Link>
            </th>
            <td className="py-1.5" aria-hidden>
              <div
                className={cn(
                  "h-2.5 rounded-xs",
                  row.kind === "rejected"
                    ? "bg-neutral-300"
                    : "bg-accent-default",
                )}
                style={{
                  width: `${(row.count / max) * 100}%`,
                  minWidth: row.count ? 4 : 0,
                }}
              />
            </td>
            <td className="w-10 py-1.5 text-right tabular-nums">{row.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DriveCard({ d }: { d: DriveListItem }) {
  const city = d.location.split(",")[0];
  return (
    <article className="flex flex-col rounded-lg border border-border-default bg-surface-raised p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-heading">
            <Link to={`/drives/${d.id}`} className="hover:underline">
              {d.title}
            </Link>
          </h3>
          <p className="mt-1 text-small text-fg-secondary">
            {d.role} · {city} · {d.openings} openings · created{" "}
            {shortDate(d.created_at)}
          </p>
        </div>
        <DriveStatusChip status={d.status} />
      </div>
      <p className="mt-5 flex items-baseline gap-2">
        <span className="text-[32px] leading-none font-semibold tabular-nums">
          {d.summary.total}
        </span>
        <span className="text-body text-fg-secondary">
          {d.summary.total === 1 ? "candidate" : "candidates"} ·{" "}
          {d.summary.on_hold} on hold
        </span>
      </p>
      <div className="mt-4 flex-1">
        <Funnel d={d} />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-border-default pt-4">
        <p className="flex min-w-0 flex-1 items-center gap-1.5 font-mono text-small text-fg-secondary">
          <Link2 aria-hidden className="size-4 shrink-0" />
          <span className="truncate">/apply/{d.slug}</span>
        </p>
        <button
          onClick={() => copyLink(d.slug)}
          className={buttonClass("ghost", "sm")}
        >
          <Copy aria-hidden className="size-4" /> Copy link
        </button>
        <Link
          to={`/drives/${d.id}/edit`}
          className={buttonClass("ghost", "sm")}
          aria-label={`Edit ${d.title}`}
        >
          <Pencil aria-hidden className="size-4" /> Edit
        </Link>
        <Link to={`/drives/${d.id}`} className={buttonClass("secondary")}>
          Open pipeline
        </Link>
      </div>
    </article>
  );
}
