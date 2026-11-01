// Domain types shared by every screen. Field names match the database.

export const CANDIDATE_STATUSES = [
  "active",
  "on_hold",
  "rejected",
  "selected",
  "details_submitted",
  "onboarded",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export type Decision = "approved" | "on_hold" | "rejected" | "reopened";

export type StageKey = `round-${number}` | "selected" | "rejected" | "all";

export const MESSAGE_TEMPLATES = [
  "application_received",
  "moved_to_round",
  "selected",
  "on_hold",
  "rejected",
  "reopened",
  "details_received",
  "changes_requested",
  "onboarded",
] as const;
export type MessageTemplate = (typeof MESSAGE_TEMPLATES)[number];

export type MessageParams = {
  candidate_name: string;
  drive_title: string;
  company: string;
  round_name?: string;
  next_round_name?: string;
  hr_message?: string;
  reason?: string;
  joining_date?: string;
};

export type Drive = {
  id: string;
  slug: string;
  title: string;
  role: string;
  location: string;
  openings: number;
  description: string;
  status: "open" | "closed";
  created_at: string;
};

export type DriveRound = {
  id: string;
  drive_id: string;
  position: number;
  name: string;
};

export type DriveSummary = {
  drive_id: string;
  active: number;
  on_hold: number;
  rejected: number;
  selected: number;
  details_submitted: number;
  onboarded: number;
  total: number;
};

export type Candidate = {
  id: string;
  drive_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  qualification: string;
  experience_years: number;
  current_round: number;
  status: CandidateStatus;
  created_at: string;
  updated_at: string;
};

export type RoundDecision = {
  id: string;
  candidate_id: string;
  round_position: number;
  round_name: string;
  decision: Decision;
  note: string | null;
  candidate_message: string | null;
  decided_by: string | null;
  decided_at: string;
};

export type JoiningDetails = {
  candidate_id: string;
  date_of_birth: string;
  aadhaar_number: string;
  pan_number: string;
  uan_number: string | null;
  bank_account_holder: string;
  bank_account_number: string;
  bank_ifsc: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  preferred_joining_date: string;
  submitted_at: string;
  changes_requested_reason: string | null;
};

export type Message = {
  id: string;
  candidate_id: string;
  template: MessageTemplate;
  params: MessageParams;
  created_at: string;
};

/** One item of `list_my_applications`. */
export type MyApplicationSummary = {
  candidate_id: string;
  drive_title: string;
  role: string;
  status: CandidateStatus;
  current_round: number;
  current_round_name: string | null;
  total_rounds: number;
  applied_at: string;
};

export type RoundRef = { position: number; name: string };

/** Shape of `get_my_application`. HR notes are never included. */
export type MyApplication = {
  candidate_id: string;
  full_name: string;
  status: CandidateStatus;
  current_round: number;
  applied_at: string;
  drive: { title: string; role: string; location: string };
  rounds: RoundRef[];
  timeline: Array<{
    round_position: number;
    round_name: string;
    decision: Decision;
    candidate_message: string | null;
    decided_at: string;
  }>;
  joining_details: JoiningDetails | null;
};

/** Shape of `get_public_drive`. */
export type PublicDrive = {
  title: string;
  role: string;
  location: string;
  description: string;
  status: "open" | "closed";
  openings: number;
  rounds: RoundRef[];
};
