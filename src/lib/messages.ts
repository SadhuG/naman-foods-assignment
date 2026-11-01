// The nine mock messages, rendered from a `messages` row (template + params).
// Copy follows the approved Figma "Messages" page. Nothing is ever sent.
import type { MessageParams, MessageTemplate } from "./types";

export const MESSAGE_FROM = {
  name: "Naman Foods Careers",
  email: "careers@namanfoods.example",
  smsSender: "NAMANF",
};
export const SMS_LINK = "namanfoods.example/me";
const SMS_MAX = 160;

export type RenderedMessage = {
  subject: string;
  /** One-line summary shown in inbox lists. */
  preheader: string;
  /** Large heading inside the email body. */
  headline: string;
  greeting: string;
  paragraphs: string[];
  /** The optional message to the candidate. Never the HR-only note. */
  hrMessage: string | null;
  cta: { label: string; href: string };
  sms: string;
};

export const TEMPLATE_LABELS: Record<MessageTemplate, string> = {
  application_received: "Application received",
  moved_to_round: "Moved to next round",
  selected: "Selected",
  on_hold: "Put on hold",
  rejected: "Not moving ahead",
  reopened: "Reopened",
  details_received: "Joining details received",
  changes_requested: "Changes requested",
  onboarded: "Onboarded",
};

/** "Aarav Mehta" → "Aarav"; "Sharma, Priya" → "Priya". */
export function firstNameOf(name: string): string {
  const n = name.includes(",") ? name.split(",")[1]! : name;
  return n.trim().split(/\s+/)[0] || name.trim();
}

/** "Walk-in drive: Production Associates" → "Production Associates". */
const shortTitle = (title: string) => title.split(": ").at(-1)!.trim();

function prettyDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Builds the SMS, shortening the drive title with "…" until it fits in 160
 * characters. As a last resort the text before the link is cut, never the link.
 */
function fitSms(make: (title: string) => string, title: string): string {
  let t = shortTitle(title);
  let sms = make(t);
  while (sms.length > SMS_MAX && t.length > 4) {
    t = `${t.slice(0, -2).trimEnd()}…`;
    sms = make(t);
  }
  if (sms.length <= SMS_MAX) return sms;
  const tail = ` ${SMS_LINK}`;
  const body = sms.endsWith(tail) ? sms.slice(0, -tail.length) : sms;
  return `${body.slice(0, SMS_MAX - tail.length - 1).trimEnd()}…${tail}`;
}

type Copy = Omit<RenderedMessage, "greeting" | "hrMessage" | "cta" | "sms"> & {
  ctaLabel?: string;
  sms: (title: string) => string;
};

function copyFor(t: MessageTemplate, p: MessageParams, first: string): Copy {
  const drive = p.drive_title;
  const round = p.round_name ?? "current round";
  const next = p.next_round_name ?? "next round";
  const sms = (body: string) => `Naman Foods: Hi ${first}, ${body} ${SMS_LINK}`;
  switch (t) {
    case "application_received":
      return {
        subject: "We've got your application",
        preheader: `Your application for ${drive} is in.`,
        headline: `Thanks for applying, ${first}`,
        paragraphs: [
          `Your application for ${drive} at ${p.company} is in.${p.round_name ? ` The first round is ${p.round_name}.` : ""} We'll email and text you as soon as there's news.`,
        ],
        ctaLabel: "Track your application",
        sms: (title) =>
          sms(`we've got your application for ${title}. Track it any time at`),
      };
    case "moved_to_round":
      return {
        subject: `You're through to the ${next}`,
        preheader: `You cleared the ${round}.`,
        headline: `You're through to the ${next}`,
        paragraphs: [
          `Good news: you cleared the ${round} for ${drive}. Your next step is the ${next}.`,
        ],
        sms: (title) =>
          sms(`you're through to the ${next} for ${title}. Details:`),
      };
    case "selected":
      return {
        subject: `You're selected for ${shortTitle(drive)}`,
        preheader: "One last step: share your joining details.",
        headline: `Welcome to ${p.company}, ${first}`,
        paragraphs: [
          `You cleared every round for ${drive}.`,
          "One last step: share your joining details (ID numbers, bank account, emergency contact). It takes about 5 minutes and there's nothing to upload.",
        ],
        ctaLabel: "Add joining details",
        sms: (title) =>
          `Naman Foods: Congratulations ${first}, you're selected for ${title}! Add your joining details at ${SMS_LINK}`,
      };
    case "on_hold":
      return {
        subject: "Your application is on hold",
        preheader: "No action needed. We'll update you soon.",
        headline: "Your application is on hold",
        paragraphs: [
          `Thanks for your patience. We've paused your application for ${drive} at the ${round} while we finish meeting other candidates. You don't need to do anything.`,
        ],
        sms: (title) =>
          sms(
            `your application for ${title} is on hold for now. No action needed. Updates:`,
          ),
      };
    case "rejected":
      return {
        subject: "An update on your application",
        preheader: "Thank you for your time with us.",
        headline: `Thank you for your time, ${first}`,
        paragraphs: [
          `Thank you for applying to ${drive}${p.round_name ? ` and for coming in for the ${p.round_name}` : ""}. We won't be taking your application further this time.`,
          `${p.company} hires through the year, and we'd be glad to see you apply again.`,
        ],
        sms: (title) =>
          sms(
            `thank you for applying for ${title}. We won't be moving ahead this time. All the best.`,
          ),
      };
    case "reopened":
      return {
        subject: "Your application is active again",
        preheader: `You're back in the ${round} round.`,
        headline: "Good news: your application is back on",
        paragraphs: [
          `We've taken another look and reopened your application for ${drive}. You're back in the ${round} round, and we'll be in touch with the next step.`,
        ],
        sms: (title) =>
          sms(
            `good news! Your application for ${title} is active again, in the ${round} round.`,
          ),
      };
    case "details_received":
      return {
        subject: "We've got your joining details",
        preheader: "HR usually reviews them within 2 working days.",
        headline: `Thanks, ${first}. Your details are in`,
        paragraphs: [
          `We've received your joining details for ${drive}. HR usually reviews them within 2 working days. If anything needs fixing, we'll tell you exactly what.`,
        ],
        sms: () =>
          sms(
            "we've received your joining details. HR will review them within 2 working days.",
          ),
      };
    case "changes_requested":
      return {
        subject: "Please update your joining details",
        preheader: "HR needs one change before your appointment letter.",
        headline: "One thing to fix in your details",
        paragraphs: [
          `HR reviewed your joining details for ${drive} and needs one change before your appointment letter can go out.`,
          `What to change: “${p.reason ?? "See your application for details."}”`,
        ],
        ctaLabel: "Update your details",
        sms: () =>
          sms(
            "HR needs one change to your joining details. See what to fix at",
          ),
      };
    case "onboarded": {
      const date = prettyDate(p.joining_date);
      return {
        subject: date
          ? `You're all set to join on ${date}`
          : "You're all set to join",
        preheader: "Your joining details are approved.",
        headline: date
          ? `See you on ${date}, ${first}`
          : `See you soon, ${first}`,
        paragraphs: [
          `Your joining details are approved and you're officially onboarded for ${drive}.`,
          `Report to the plant HR desk at 9:00 am${date ? ` on ${date}` : " on your joining day"}. Bring the original ID cards whose numbers you shared.`,
        ],
        sms: () =>
          sms(
            `you're onboarded! Report to the plant HR desk, 9 am${date ? `, ${date}` : ""}. Bring original IDs.`,
          ),
      };
    }
  }
}

export function renderMessage(
  template: MessageTemplate,
  params: MessageParams,
  ctx: { appUrl: string; candidateId: string },
): RenderedMessage {
  const first = firstNameOf(params.candidate_name);
  const c = copyFor(template, params, first);
  const hr = params.hr_message?.trim();
  return {
    subject: c.subject,
    preheader: c.preheader,
    headline: c.headline,
    greeting: `Hi ${first},`,
    paragraphs: c.paragraphs,
    hrMessage: hr ? hr : null,
    cta: {
      label: c.ctaLabel ?? "View your application",
      href: `${ctx.appUrl}/me/applications/${ctx.candidateId}`,
    },
    sms: fitSms(c.sms, params.drive_title),
  };
}
