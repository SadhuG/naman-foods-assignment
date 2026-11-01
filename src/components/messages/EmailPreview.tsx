import { cn } from "../ui/cn";
import { MESSAGE_FROM, type RenderedMessage } from "../../lib/messages";
import { DemoMarker } from "./DemoMarker";

/** A mock email in mail-client chrome: from, to, date, subject, branded body, button. */
export function EmailPreview({
  message,
  to,
  sentAt,
  driveTitle,
  className,
  linkable = true,
}: {
  message: RenderedMessage;
  to: string;
  sentAt: string;
  driveTitle: string;
  className?: string;
  /** Live previews (before sending) render the button without a link. */
  linkable?: boolean;
}) {
  return (
    <article
      aria-label={`Email: ${message.subject}`}
      className={cn(
        "overflow-hidden rounded-lg border border-border-default bg-surface-raised",
        className,
      )}
    >
      <header className="border-b border-border-default px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-title">{message.subject}</h3>
          <DemoMarker />
        </div>
        <dl className="mt-1.5 text-small text-fg-secondary">
          <div className="flex gap-2">
            <dt>From</dt>
            <dd className="min-w-0 truncate">
              {MESSAGE_FROM.name} &lt;{MESSAGE_FROM.email}&gt;
            </dd>
          </div>
          <div className="flex gap-2">
            <dt>To</dt>
            <dd className="min-w-0 truncate">
              {to} · {sentAt}
            </dd>
          </div>
        </dl>
      </header>
      <div className="bg-surface-canvas p-3 sm:p-5">
        <div className="rounded-md border-t-4 border-accent-brand bg-surface-raised px-5 py-6 sm:px-8 sm:py-8">
          <p className="flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-[-0.02em] text-accent-default">
              naman
            </span>
            <span className="text-small text-fg-secondary">Careers</span>
          </p>
          <h4 className="mt-5 text-[26px] leading-8 font-semibold tracking-[-0.02em] sm:text-[32px] sm:leading-10">
            {message.headline}
          </h4>
          <p className="mt-5 text-body">{message.greeting}</p>
          {message.paragraphs.map((p) => (
            <p key={p} className="mt-4 text-body">
              {p}
            </p>
          ))}
          {message.hrMessage && (
            <div className="mt-5 rounded-md bg-surface-brand px-4 py-3">
              <p className="text-small text-accent-default">
                A note from the hiring team
              </p>
              <p className="mt-1 text-body whitespace-pre-line">
                {message.hrMessage}
              </p>
            </div>
          )}
          {linkable ? (
            <a
              href={message.cta.href}
              className="mt-6 inline-flex h-9 items-center rounded-md bg-accent-default px-4 text-label text-fg-on-accent hover:bg-accent-hover"
            >
              {message.cta.label}
            </a>
          ) : (
            <span className="mt-6 inline-flex h-9 items-center rounded-md bg-accent-default px-4 text-label text-fg-on-accent">
              {message.cta.label}
            </span>
          )}
          <p className="mt-6 text-small text-fg-secondary">
            You're getting this because you applied to {driveTitle} at Naman
            Foods. Demo: this message was not actually sent.
          </p>
        </div>
      </div>
    </article>
  );
}
