import { funnelFor, slugify, type DriveInput, type FunnelRow } from "../drives";
import { supabase } from "../supabase";
import type {
  CandidateStatus,
  Drive,
  DriveRound,
  DriveSummary,
} from "../types";

export type DriveListItem = Drive & {
  summary: DriveSummary;
  rounds: DriveRound[];
  funnel: FunnelRow[];
  lastChange: string | null;
};

const EMPTY_SUMMARY = {
  active: 0,
  on_hold: 0,
  rejected: 0,
  selected: 0,
  details_submitted: 0,
  onboarded: 0,
  total: 0,
};

export async function listDrives(): Promise<DriveListItem[]> {
  const [drives, rounds, people] = await Promise.all([
    supabase
      .from("drives")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("drive_rounds").select("*").order("position"),
    supabase
      .from("candidates")
      .select("drive_id, status, current_round, updated_at"),
  ]);
  for (const r of [drives, rounds, people]) if (r.error) throw r.error;
  return (drives.data as Drive[]).map((d) => {
    const mine = people.data!.filter((c) => c.drive_id === d.id);
    const myRounds = (rounds.data as DriveRound[]).filter(
      (r) => r.drive_id === d.id,
    );
    const summary: DriveSummary = { drive_id: d.id, ...EMPTY_SUMMARY };
    for (const c of mine) {
      summary[c.status as CandidateStatus] += 1;
      summary.total += 1;
    }
    const lastChange = mine.reduce<string | null>(
      (max, c) => (!max || c.updated_at > max ? c.updated_at : max),
      null,
    );
    return {
      ...d,
      summary,
      rounds: myRounds,
      funnel: funnelFor(myRounds, mine),
      lastChange,
    };
  });
}

export async function getDrive(
  id: string,
): Promise<{ drive: Drive; rounds: DriveRound[]; candidateCount: number }> {
  const [drive, rounds, count] = await Promise.all([
    supabase.from("drives").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("drive_rounds")
      .select("*")
      .eq("drive_id", id)
      .order("position"),
    supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .eq("drive_id", id),
  ]);
  if (drive.error) throw drive.error;
  if (!drive.data) throw new Error("drive_not_found");
  if (rounds.error) throw rounds.error;
  if (count.error) throw count.error;
  return {
    drive: drive.data as Drive,
    rounds: rounds.data as DriveRound[],
    candidateCount: count.count ?? 0,
  };
}

async function save(
  id: string | null,
  slug: string,
  input: DriveInput,
  status: "open" | "closed",
): Promise<string> {
  const { data, error } = await supabase.rpc("hr_save_drive", {
    p_drive_id: id as string,
    p_slug: slug,
    p_title: input.title,
    p_role: input.role,
    p_location: input.location,
    p_openings: input.openings,
    p_description: input.description,
    p_status: status,
    p_rounds: input.rounds,
  });
  if (error) throw error;
  return data as string;
}

export async function createDrive(
  input: DriveInput,
  status: "open" | "closed" = "open",
): Promise<Drive> {
  const slug = slugify(input.title, crypto.randomUUID().slice(0, 4));
  const id = await save(null, slug, input, status);
  return (await getDrive(id)).drive;
}

/** When rounds are locked the server only renames them; it rejects a changed count. */
export async function updateDrive(
  id: string,
  input: DriveInput,
  status: "open" | "closed",
): Promise<void> {
  await save(id, "", input, status);
}

export async function setDriveStatus(
  id: string,
  status: "open" | "closed",
): Promise<void> {
  const { error } = await supabase
    .from("drives")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export const driveKeys = {
  all: ["drives"] as const,
  one: (id: string) => ["drive", id] as const,
};

export const applyUrl = (slug: string) =>
  `${window.location.origin}/apply/${slug}`;
