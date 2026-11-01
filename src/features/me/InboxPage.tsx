import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Inbox } from "lucide-react";
import { useSearchParams } from "react-router";
import { EmailPreview } from "../../components/messages/EmailPreview";
import { DemoMarker } from "../../components/messages/DemoMarker";
import {
  MessageList,
  renderStored,
  sentAt,
} from "../../components/messages/MessageList";
import { SmsPreview } from "../../components/messages/SmsPreview";
import { Banner } from "../../components/ui/Banner";
import { Card } from "../../components/ui/Brand";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import { cn } from "../../components/ui/cn";
import { friendlyError } from "../../lib/api/errors";
import { listMyMessages, messageKeys } from "../../lib/api/messages";
import { CandidateShell } from "./CandidateShell";

/** Every email + SMS the candidate would have received. List → detail on phones. */
export default function InboxPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get("m");
  const q = useQuery({ queryKey: messageKeys.mine, queryFn: listMyMessages });
  const items = q.data ?? [];
  const open = items.find((m) => m.id === openId) ?? null;
  const select = (id: string | null) =>
    setParams(id ? { m: id } : {}, { replace: false });

  return (
    <CandidateShell wide>
      <div className={cn(open && "hidden lg:block")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-display">Inbox</h1>
          <DemoMarker />
        </div>
        <p className="mt-2 text-body text-fg-secondary">
          Every email and SMS Naman Foods would send you. This is a demo, so
          nothing actually leaves the app.
        </p>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        <Card className={cn("overflow-hidden", open && "hidden lg:block")}>
          {q.isPending ? (
            <PageSpinner />
          ) : q.isError ? (
            <div className="p-4">
              <Banner tone="danger" title={friendlyError(q.error)} />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing here yet"
              body="When you apply to a drive, the confirmation email and SMS show up here."
            />
          ) : (
            <MessageList
              label="Messages"
              items={items}
              selectedId={openId}
              onSelect={select}
            />
          )}
        </Card>

        {open ? (
          <div className="flex min-w-0 flex-col gap-4">
            <button
              onClick={() => select(null)}
              className="inline-flex items-center gap-1 self-start text-label text-fg-link hover:underline lg:hidden"
            >
              <ChevronLeft aria-hidden className="size-4" /> Inbox
            </button>
            <EmailPreview
              message={renderStored(open)}
              to={open.candidate_email}
              sentAt={sentAt(open.created_at)}
              driveTitle={open.params.drive_title}
            />
            <div>
              <p className="mb-2 text-small text-fg-secondary">
                Sent with this email
              </p>
              <SmsPreview
                message={renderStored(open)}
                phone={open.candidate_phone}
                sentAt={sentAt(open.created_at)}
              />
            </div>
          </div>
        ) : (
          items.length > 0 && (
            <div className="hidden min-h-80 place-items-center rounded-lg border border-dashed border-border-strong text-small text-fg-secondary lg:grid">
              Pick a message to read it.
            </div>
          )
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {open ? `Opened: ${renderStored(open).subject}` : ""}
      </p>
    </CandidateShell>
  );
}
