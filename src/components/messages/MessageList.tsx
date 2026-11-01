import { Mail } from "lucide-react";
import type { AddressedMessage } from "../../lib/api/messages";
import { renderMessage, type RenderedMessage } from "../../lib/messages";
import { cn } from "../ui/cn";

/** Renders a stored message row for display in this app. */
export function renderStored(m: AddressedMessage): RenderedMessage {
  return renderMessage(m.template, m.params, {
    appUrl: window.location.origin,
    candidateId: m.candidate_id,
  });
}

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const fullFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "2:14 pm" today, otherwise "24 Oct". */
export function listTime(iso: string): string {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? timeFmt.format(d)
    : dayFmt.format(d);
}
export const sentAt = (iso: string) => fullFmt.format(new Date(iso));

export function MessageList({
  items,
  selectedId,
  onSelect,
  showCandidate,
  label,
}: {
  items: AddressedMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** HR outbox: prefix the subject with the candidate's name. */
  showCandidate?: boolean;
  label: string;
}) {
  return (
    <ul aria-label={label} className="divide-y divide-border-default">
      {items.map((m) => {
        const r = renderStored(m);
        const on = m.id === selectedId;
        return (
          <li key={m.id}>
            <button
              onClick={() => onSelect(m.id)}
              aria-current={on ? "true" : undefined}
              className={cn(
                "flex w-full gap-3 px-4 py-3.5 text-left hover:bg-surface-hover",
                on && "bg-surface-selected hover:bg-surface-selected",
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken text-fg-secondary">
                <Mail aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-body">
                    {showCandidate && `${m.candidate_name} · `}
                    {r.subject}
                  </span>
                  <span className="shrink-0 font-mono text-small text-fg-secondary">
                    {listTime(m.created_at)}
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-small text-fg-secondary">
                  {r.preheader}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
