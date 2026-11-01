import { MESSAGE_FROM, type RenderedMessage } from "../../lib/messages";
import { cn } from "../ui/cn";
import { DemoMarker } from "./DemoMarker";

/** A mock SMS bubble from the NAMANF sender ID. */
export function SmsPreview({
  message,
  phone,
  sentAt,
  className,
}: {
  message: RenderedMessage;
  phone: string;
  sentAt: string;
  className?: string;
}) {
  return (
    <article
      aria-label="Text message"
      className={cn(
        "rounded-lg border border-border-default bg-surface-raised p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-accent-soft text-label text-accent-default"
        >
          N
        </span>
        <div>
          <p className="text-label">{MESSAGE_FROM.smsSender} · SMS</p>
          <p className="text-small text-fg-secondary">
            +91{" "}
            {phone.length === 10
              ? `${phone.slice(0, 5)} ${phone.slice(5)}`
              : phone}
          </p>
        </div>
      </div>
      <p className="mt-3 max-w-72 rounded-2xl rounded-tl-sm bg-surface-sunken px-4 py-3 text-body">
        {message.sms}
      </p>
      <p className="mt-3 font-mono text-small text-fg-secondary">
        {message.sms.length}/160 characters · {sentAt}
      </p>
      <div className="mt-2">
        <DemoMarker />
      </div>
    </article>
  );
}
