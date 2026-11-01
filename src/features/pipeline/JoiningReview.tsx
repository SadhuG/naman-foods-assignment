import { useQueryClient } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { FieldError, Textarea } from "../../components/ui/Field";
import { MaskedValue } from "../../components/ui/MaskedValue";
import {
  markOnboarded,
  requestChanges,
  type CandidateDetail,
} from "../../lib/api/candidates";
import { friendlyError } from "../../lib/api/errors";
import { dateTime, formatPhone, longDate } from "../../lib/copy";
import { joiningProgressLabel } from "../../lib/schemas";
import { DefinitionList, DrawerSection } from "./DrawerParts";

/** Drawer section: the candidate's joining details, IDs masked with a reveal toggle. */
export function JoiningReview({ detail }: { detail: CandidateDetail }) {
  const { candidate: c, joining: j } = detail;
  if (!["selected", "details_submitted", "onboarded"].includes(c.status))
    return null;
  const progress = joiningProgressLabel(
    c.status,
    !!j?.changes_requested_reason,
  );
  if (!j || (c.status === "selected" && !j.changes_requested_reason))
    return (
      <DrawerSection title="Joining details" aside={progress}>
        <p className="text-small text-fg-secondary">
          Waiting for {c.full_name.split(/[\s,]+/)[0]} to submit them.
        </p>
      </DrawerSection>
    );
  const rows: Array<[string, ReactNode]> = [
    ["Date of birth", longDate(j.date_of_birth)],
    [
      "Aadhaar",
      <MaskedValue value={j.aadhaar_number} label="Aadhaar number" />,
    ],
    ["PAN", <MaskedValue value={j.pan_number} label="PAN" />],
    [
      "UAN",
      j.uan_number ? (
        <MaskedValue value={j.uan_number} label="UAN" />
      ) : (
        "Not provided"
      ),
    ],
    ["Bank", `${j.bank_account_holder} · ${j.bank_ifsc}`],
    [
      "Account number",
      <MaskedValue value={j.bank_account_number} label="account number" />,
    ],
    ["Address", j.address],
    [
      "Emergency contact",
      `${j.emergency_contact_name} · ${formatPhone(j.emergency_contact_phone)}`,
    ],
    ["Joining date", longDate(j.preferred_joining_date)],
  ];
  return (
    <DrawerSection
      title="Joining details"
      aside={`${progress} · ${dateTime(j.submitted_at)}`}
    >
      {j.changes_requested_reason && (
        <p className="mb-3 rounded-md bg-status-on_hold-bg px-3 py-2 text-small text-status-on_hold-fg">
          Changes requested: “{j.changes_requested_reason}”
        </p>
      )}
      <DefinitionList rows={rows} />
    </DrawerSection>
  );
}

/** Drawer footer for selected candidates: request changes or mark onboarded. */
export function JoiningActions({ detail }: { detail: CandidateDetail }) {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = detail.candidate.status === "details_submitted";
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["candidates"] }),
      queryClient.invalidateQueries({ queryKey: ["candidate"] }),
      queryClient.invalidateQueries({ queryKey: ["drives"] }),
      queryClient.invalidateQueries({ queryKey: ["change-requests"] }),
    ]);
  return (
    <>
      <Button
        variant="secondary"
        disabled={!ready}
        onClick={() => setAsking(true)}
      >
        Request changes
      </Button>
      <Button
        disabled={!ready}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await markOnboarded(detail.candidate.id);
            toast.success(`${detail.candidate.full_name} marked onboarded`);
            await refresh();
          } catch (e) {
            toast.error(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Mark onboarded
      </Button>
      <RequestChangesDialog
        open={asking}
        name={detail.candidate.full_name}
        onClose={() => setAsking(false)}
        onConfirm={async (reason) => {
          await requestChanges(detail.candidate.id, reason);
          toast.success(
            `Asked ${detail.candidate.full_name} to update their details`,
          );
          await refresh();
        }}
      />
    </>
  );
}

function RequestChangesDialog({
  open,
  name,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Request changes"
      description={`${name} gets an email and SMS with your reason, and can resubmit.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              if (!reason.trim()) {
                setError("Tell the candidate what to change.");
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await onConfirm(reason.trim());
                setReason("");
                onClose();
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Send request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-label">
          What should they change?
        </label>
        <Textarea
          id={id}
          rows={4}
          maxLength={500}
          value={reason}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setReason(e.target.value)}
          placeholder="The IFSC belongs to a Delhi branch, but your address is in Jaipur. Please check your passbook."
        />
        <p className="text-small text-fg-secondary">
          The candidate sees this exactly as written.
        </p>
        {error && <FieldError>{error}</FieldError>}
      </div>
    </Dialog>
  );
}
