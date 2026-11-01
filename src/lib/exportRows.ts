// Row builders for every CSV export. Pure functions over already-loaded data.
import { csvDateTime, type Cell } from "./csv";
import { renderMessage, TEMPLATE_LABELS } from "./messages";
import { STATUS_LABEL_TEXT } from "./statusLabels";
import type {
  Candidate,
  Drive,
  DriveRound,
  JoiningDetails,
  Message,
  RoundDecision,
} from "./types";

export type ExportInput = {
  drive: Drive;
  rounds: DriveRound[];
  candidates: Candidate[];
  decisions: RoundDecision[];
  joining: JoiningDetails[];
  messages: Message[];
  appUrl: string;
};
export type Table = { headers: string[]; rows: Cell[][] };

export const STAGE_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "City",
  "Qualification",
  "Experience (yrs)",
  "Status",
  "Current round",
  "Applied on",
  "Last decision",
  "Last internal note",
  "Has account",
];

const JOINING_HEADERS = [
  "Date of birth",
  "Aadhaar",
  "PAN",
  "UAN",
  "Account holder",
  "Bank account",
  "IFSC",
  "Address",
  "Emergency contact",
  "Emergency phone",
  "Preferred joining",
  "Details submitted on",
  "Changes requested",
];

const byTime = (a: RoundDecision, b: RoundDecision) =>
  a.decided_at < b.decided_at ? -1 : a.decided_at > b.decided_at ? 1 : 0;

function decisionsByCandidate(input: ExportInput) {
  const map = new Map<string, RoundDecision[]>();
  for (const d of [...input.decisions].sort(byTime)) {
    map.set(d.candidate_id, [...(map.get(d.candidate_id) ?? []), d]);
  }
  return map;
}

function stageRow(
  c: Candidate,
  input: ExportInput,
  mine: RoundDecision[],
): Cell[] {
  const round = input.rounds.find((r) => r.position === c.current_round);
  const last = mine.at(-1);
  const lastNote = [...mine].reverse().find((d) => d.note)?.note ?? "";
  return [
    c.full_name,
    c.email,
    { text: c.phone },
    c.city,
    c.qualification,
    Number(c.experience_years),
    STATUS_LABEL_TEXT[c.status],
    round ? `${round.position} · ${round.name}` : c.current_round,
    csvDateTime(c.created_at),
    last ? `${last.round_name}: ${last.decision}` : "",
    lastNote,
    c.user_id ? "Yes" : "No",
  ];
}

export function buildCandidateRows(
  input: ExportInput,
  candidates: Candidate[],
): Table {
  const byCandidate = decisionsByCandidate(input);
  return {
    headers: STAGE_HEADERS,
    rows: candidates.map((c) =>
      stageRow(c, input, byCandidate.get(c.id) ?? []),
    ),
  };
}

export function buildFullReport(input: ExportInput): Table {
  const byCandidate = decisionsByCandidate(input);
  const joining = new Map(input.joining.map((j) => [j.candidate_id, j]));
  const rounds = [...input.rounds].sort((a, b) => a.position - b.position);
  const headers = [
    ...STAGE_HEADERS,
    ...rounds.flatMap((r) => [
      `${r.name} decision`,
      `${r.name} note`,
      `${r.name} date`,
    ]),
    ...JOINING_HEADERS,
  ];
  const rows = input.candidates.map((c) => {
    const mine = byCandidate.get(c.id) ?? [];
    const perRound = rounds.flatMap((r) => {
      // The latest decision in the round wins (e.g. hold, then approved).
      const latest = mine.filter((d) => d.round_position === r.position).at(-1);
      return latest
        ? [latest.decision, latest.note ?? "", csvDateTime(latest.decided_at)]
        : ["", "", ""];
    });
    const j = joining.get(c.id);
    const joiningCells: Cell[] = j
      ? [
          j.date_of_birth,
          { text: j.aadhaar_number },
          { text: j.pan_number },
          j.uan_number ? { text: j.uan_number } : "",
          j.bank_account_holder,
          { text: j.bank_account_number },
          { text: j.bank_ifsc },
          j.address,
          j.emergency_contact_name,
          { text: j.emergency_contact_phone },
          j.preferred_joining_date,
          csvDateTime(j.submitted_at),
          j.changes_requested_reason ?? "",
        ]
      : JOINING_HEADERS.map(() => "");
    return [...stageRow(c, input, mine), ...perRound, ...joiningCells];
  });
  return { headers, rows };
}

export function buildDecisionLog(input: ExportInput): Table {
  const people = new Map(input.candidates.map((c) => [c.id, c]));
  return {
    headers: [
      "Candidate",
      "Email",
      "Round",
      "Decision",
      "Internal note",
      "Message to candidate",
      "Decided at",
    ],
    rows: [...input.decisions].sort(byTime).map((d) => {
      const c = people.get(d.candidate_id);
      return [
        c?.full_name ?? "",
        c?.email ?? "",
        d.round_name,
        d.decision,
        d.note ?? "",
        d.candidate_message ?? "",
        csvDateTime(d.decided_at),
      ];
    }),
  };
}

export function buildMessageLog(input: ExportInput): Table {
  const people = new Map(input.candidates.map((c) => [c.id, c]));
  return {
    headers: [
      "Candidate",
      "Email",
      "Type",
      "Email subject",
      "SMS text",
      "Created at",
    ],
    rows: [...input.messages]
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((m) => {
        const c = people.get(m.candidate_id);
        const r = renderMessage(m.template, m.params, {
          appUrl: input.appUrl,
          candidateId: m.candidate_id,
        });
        return [
          c?.full_name ?? m.params.candidate_name,
          c?.email ?? "",
          TEMPLATE_LABELS[m.template],
          r.subject,
          r.sms,
          csvDateTime(m.created_at),
        ];
      }),
  };
}
