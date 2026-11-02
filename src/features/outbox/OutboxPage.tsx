import { useQuery } from "@tanstack/react-query";
import { QueryError } from "../../components/ui/QueryError";
import { Download, Inbox, Search } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { runExport } from "../export/ExportMenu";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { EmailPreview } from "../../components/messages/EmailPreview";
import {
  MessageList,
  renderStored,
  sentAt,
} from "../../components/messages/MessageList";
import { SmsPreview } from "../../components/messages/SmsPreview";
import { Card } from "../../components/ui/Brand";
import { EmptyState } from "../../components/ui/EmptyState";
import { Select } from "../../components/ui/Field";
import { PageSpinner } from "../../components/ui/Spinner";
import { StatusChip } from "../../components/ui/StatusChip";
import { driveKeys, getDrive } from "../../lib/api/drives";
import { listDriveMessages, messageKeys } from "../../lib/api/messages";
import { formatPhone, plural } from "../../lib/copy";
import { TEMPLATE_LABELS } from "../../lib/messages";
import { MESSAGE_TEMPLATES, type MessageTemplate } from "../../lib/types";
import { Breadcrumbs, HrShell } from "../hr/HrShell";

/** Every message candidates in one drive would have received. */
export default function OutboxPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const template = (params.get("template") ?? "") as MessageTemplate | "";
  const drive = useQuery({
    queryKey: driveKeys.one(id),
    queryFn: () => getDrive(id),
  });
  const msgs = useQuery({
    queryKey: messageKeys.drive(id),
    queryFn: () => listDriveMessages(id),
  });
  const all = msgs.data ?? [];
  const needle = q.trim().toLowerCase();
  const items = all.filter(
    (m) =>
      (!template || m.template === template) &&
      (!needle ||
        m.candidate_name.toLowerCase().includes(needle) ||
        m.candidate_email.toLowerCase().includes(needle) ||
        renderStored(m).subject.toLowerCase().includes(needle)),
  );
  const openId = params.get("m") ?? items[0]?.id ?? null;
  const open = items.find((m) => m.id === openId) ?? items[0] ?? null;
  const set = (k: string, v: string | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    });
  const d = drive.data?.drive;
  const people = new Set(all.map((m) => m.candidate_id)).size;

  return (
    <HrShell>
      <Breadcrumbs
        items={[
          ["Drives", "/drives"],
          [d?.title ?? "Drive", `/drives/${id}`],
          ["Outbox"],
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Outbox</h1>
          <p className="mt-1 text-body text-fg-secondary">
            Every email and SMS candidates in this drive would have received.
            Nothing is actually sent.
            {msgs.data &&
              ` ${plural(all.length, "message")} to ${plural(people, "candidate")}.`}
          </p>
        </div>
        {d && (
          <Button variant="secondary" onClick={() => runExport(d, "messages")}>
            <Download aria-hidden className="size-4" /> Export message log
          </Button>
        )}
      </div>

      {msgs.isPending ? (
        <PageSpinner />
      ) : msgs.isError ? (
        <QueryError error={msgs.error} onRetry={() => msgs.refetch()} />
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[420px_1fr]">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-border-default p-3">
              <label className="relative">
                <span className="sr-only">Search by candidate or subject</span>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-secondary"
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by candidate or subject"
                  className="h-10 w-full rounded-md border border-border-strong bg-surface-raised pr-3 pl-9 text-body placeholder:text-fg-secondary focus:border-border-focus focus:ring-1 focus:ring-border-focus focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-small text-fg-secondary">
                <span className="shrink-0">Template</span>
                <div className="flex-1">
                  <Select
                    value={template}
                    onChange={(e) => set("template", e.target.value || null)}
                  >
                    <option value="">All templates ({all.length})</option>
                    {MESSAGE_TEMPLATES.map((t) => (
                      <option key={t} value={t}>
                        {TEMPLATE_LABELS[t]} (
                        {all.filter((m) => m.template === t).length})
                      </option>
                    ))}
                  </Select>
                </div>
              </label>
            </div>
            {items.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No messages match"
                body="Messages appear as candidates apply and you make decisions."
              />
            ) : (
              <div className="max-h-[calc(100dvh-320px)] overflow-y-auto">
                <MessageList
                  label="Sent messages"
                  items={items}
                  selectedId={open?.id ?? null}
                  onSelect={(mid) => set("m", mid)}
                  showCandidate
                />
              </div>
            )}
          </Card>

          {open && (
            <div className="flex min-w-0 flex-col gap-4">
              <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-label">To {open.candidate_name}</p>
                  <p className="truncate text-small text-fg-secondary">
                    {open.candidate_email} · +91{" "}
                    {formatPhone(open.candidate_phone)} ·{" "}
                    {sentAt(open.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-sm bg-surface-sunken px-2 py-0.5 font-mono text-small text-neutral-600">
                    {open.template}
                  </span>
                  <StatusChip status={open.candidate_status} />
                </div>
              </Card>
              <div className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
                <EmailPreview
                  message={renderStored(open)}
                  to={open.candidate_email}
                  sentAt={sentAt(open.created_at)}
                  driveTitle={open.params.drive_title}
                  linkable={false}
                />
                <SmsPreview
                  message={renderStored(open)}
                  phone={open.candidate_phone}
                  sentAt={sentAt(open.created_at)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </HrShell>
  );
}
