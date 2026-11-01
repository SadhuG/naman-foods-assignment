import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "../../components/ui/cn";
import { StatusChip } from "../../components/ui/StatusChip";
import { formatPhone, shortDate } from "../../lib/copy";
import type { Candidate } from "../../lib/types";

const exp = (n: number) =>
  n === 0 ? "fresher" : `${n} ${n === 1 ? "yr" : "yrs"}`;

function HeaderCheckbox({
  all,
  some,
  onChange,
}: {
  all: boolean;
  some: boolean;
  onChange: (on: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all;
  }, [some, all]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="Select all shown"
      checked={all}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 accent-accent-default"
    />
  );
}

export function CandidateTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  fresh,
  joining,
}: {
  rows: Candidate[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (on: boolean) => void;
  onOpen: (id: string) => void;
  /** Ids that arrived live, highlighted briefly. */
  fresh: Set<string>;
  /** Selected tab: joining-details progress per candidate. */
  joining?: (c: Candidate) => string;
}) {
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const some = rows.some((r) => selected.has(r.id));
  return (
    <div className="overflow-x-auto rounded-lg border border-border-default bg-surface-raised">
      <table className="w-full min-w-240 text-body">
        <thead>
          <tr className="border-b border-border-default text-left text-small text-fg-secondary">
            <th scope="col" className="w-12 py-2.5 pl-4">
              <HeaderCheckbox all={all} some={some} onChange={onToggleAll} />
            </th>
            <th scope="col" className="py-2.5 font-normal">
              Candidate
            </th>
            <th scope="col" className="py-2.5 font-normal">
              Phone
            </th>
            <th scope="col" className="py-2.5 font-normal">
              City
            </th>
            <th scope="col" className="py-2.5 font-normal">
              Qualification
            </th>
            <th scope="col" className="py-2.5 font-normal">
              Status
            </th>
            {joining && (
              <th scope="col" className="py-2.5 font-normal">
                Joining details
              </th>
            )}
            <th scope="col" className="py-2.5 font-normal">
              Applied
            </th>
            <th scope="col" className="w-12 py-2.5">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const on = selected.has(c.id);
            return (
              <tr
                key={c.id}
                onClick={() => onOpen(c.id)}
                className={cn(
                  "cursor-pointer border-b border-border-default last:border-b-0 hover:bg-surface-hover",
                  on && "bg-surface-selected hover:bg-surface-selected",
                  fresh.has(c.id) && "animate-pulse bg-status-selected-bg",
                )}
              >
                <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.full_name}`}
                    checked={on}
                    onChange={() => onToggle(c.id)}
                    className="size-4 accent-accent-default"
                  />
                </td>
                <td className="py-3 pr-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(c.id);
                    }}
                    className="text-left"
                  >
                    <span className="block text-body">{c.full_name}</span>
                    <span className="block text-small text-fg-secondary">
                      {c.email}
                    </span>
                  </button>
                </td>
                <td className="py-3 pr-4 font-mono text-mono whitespace-nowrap">
                  {formatPhone(c.phone)}
                </td>
                <td className="py-3 pr-4">{c.city}</td>
                <td className="py-3 pr-4">
                  {c.qualification} · {exp(Number(c.experience_years))}
                </td>
                <td className="py-3 pr-4">
                  <StatusChip status={c.status} />
                </td>
                {joining && (
                  <td className="py-3 pr-4 text-small whitespace-nowrap">
                    {joining(c)}
                  </td>
                )}
                <td className="py-3 pr-4 font-mono text-mono whitespace-nowrap text-fg-secondary">
                  {shortDate(c.created_at)}
                </td>
                <td className="py-3 pr-4 text-fg-secondary">
                  <MoreHorizontal aria-hidden className="size-4" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
