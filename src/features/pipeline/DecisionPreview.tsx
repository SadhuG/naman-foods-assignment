import { Mail } from "lucide-react";
import { useState } from "react";
import { EmailPreview } from "../../components/messages/EmailPreview";
import {
  listTime,
  renderStored,
  sentAt,
} from "../../components/messages/MessageList";
import { SmsPreview } from "../../components/messages/SmsPreview";
import { Dialog } from "../../components/ui/Dialog";
import type { CandidateDetail } from "../../lib/api/candidates";
import { renderMessage, TEMPLATE_LABELS } from "../../lib/messages";
import type {
  Candidate,
  Decision,
  Drive,
  DriveRound,
  MessageParams,
  MessageTemplate,
} from "../../lib/types";
import type { DecisionPreview } from "./DecisionDialog";
import { DrawerSection } from "./DrawerParts";

/** Which template hr_decide will write for this candidate (mirrors 0004_hr_rpc.sql). */
function templateFor(
  d: Decision,
  c: Candidate,
  rounds: DriveRound[],
): MessageTemplate {
  if (d === "approved")
    return c.current_round < rounds.length ? "moved_to_round" : "selected";
  return d;
}

/** Live email preview for the decision dialog: the first eligible candidate's email. */
export function decisionPreview(
  drive: Drive,
  rounds: DriveRound[],
): DecisionPreview {
  return function Preview({ decision, message, candidates }) {
    const c = candidates[0];
    if (!c) return null;
    const name = (p: number) => rounds.find((r) => r.position === p)?.name;
    const params: MessageParams = {
      candidate_name: c.full_name,
      drive_title: drive.title,
      company: "Naman Foods",
      round_name: name(c.current_round),
      next_round_name:
        decision === "approved" ? name(c.current_round + 1) : undefined,
      hr_message: message.trim() || undefined,
    };
    const rendered = renderMessage(templateFor(decision, c, rounds), params, {
      appUrl: window.location.origin,
      candidateId: c.id,
    });
    const others = candidates.length - 1;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-label">
          Preview for {c.full_name}
          {others > 0 && ` (+${others} ${others === 1 ? "other" : "others"})`}
        </p>
        <EmailPreview
          message={rendered}
          to={c.email}
          sentAt="when you confirm"
          driveTitle={drive.title}
          linkable={false}
        />
        <p className="text-small text-fg-secondary">
          Also sent by SMS · {rendered.sms.length}/160 characters. The SMS never
          includes your message.
        </p>
      </div>
    );
  };
}

/** Drawer section: every message this candidate was sent; click to open it. */
export function DrawerMessages({ detail }: { detail: CandidateDetail }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const c = detail.candidate;
  const items = [...detail.messages].reverse().map((m) => ({
    ...m,
    candidate_name: c.full_name,
    candidate_email: c.email,
    candidate_phone: c.phone,
    candidate_status: c.status,
  }));
  const open = items.find((m) => m.id === openId);
  return (
    <DrawerSection title="Messages" aside={`${items.length} sent (demo)`}>
      {items.length === 0 ? (
        <p className="text-small text-fg-secondary">No messages yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setOpenId(m.id)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-sunken"
              >
                <Mail aria-hidden className="size-4 text-fg-secondary" />
                <span className="flex-1 text-body">
                  {TEMPLATE_LABELS[m.template]}
                </span>
                <span className="font-mono text-small text-fg-secondary">
                  {listTime(m.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Dialog
          open
          size="lg"
          onClose={() => setOpenId(null)}
          title={TEMPLATE_LABELS[open.template]}
          description={`To ${c.full_name} · ${sentAt(open.created_at)}`}
        >
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
            <EmailPreview
              message={renderStored(open)}
              to={c.email}
              sentAt={sentAt(open.created_at)}
              driveTitle={open.params.drive_title}
              linkable={false}
            />
            <SmsPreview
              message={renderStored(open)}
              phone={c.phone}
              sentAt={sentAt(open.created_at)}
            />
          </div>
        </Dialog>
      )}
    </DrawerSection>
  );
}
