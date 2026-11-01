import type { ExportInput } from "../exportRows";
import { supabase } from "../supabase";
import type {
  Candidate,
  Drive,
  DriveRound,
  JoiningDetails,
  Message,
  RoundDecision,
} from "../types";

/** Everything the exports need for one drive, loaded in parallel. */
export async function loadExportInput(driveId: string): Promise<ExportInput> {
  const [drive, rounds, candidates, decisions, joining, messages] =
    await Promise.all([
      supabase.from("drives").select("*").eq("id", driveId).single(),
      supabase
        .from("drive_rounds")
        .select("*")
        .eq("drive_id", driveId)
        .order("position"),
      supabase
        .from("candidates")
        .select("*")
        .eq("drive_id", driveId)
        .order("created_at", { ascending: false }),
      supabase
        .from("round_decisions")
        .select("*, candidates!inner(drive_id)")
        .eq("candidates.drive_id", driveId),
      supabase
        .from("joining_details")
        .select("*, candidates!inner(drive_id)")
        .eq("candidates.drive_id", driveId),
      supabase
        .from("messages")
        .select("*, candidates!inner(drive_id)")
        .eq("candidates.drive_id", driveId),
    ]);
  for (const r of [drive, rounds, candidates, decisions, joining, messages])
    if (r.error) throw r.error;
  const strip = <T>(rows: unknown[]) =>
    rows.map((r) => {
      const { candidates: _c, ...rest } = r as Record<string, unknown>;
      return rest as T;
    });
  return {
    drive: drive.data as Drive,
    rounds: rounds.data as DriveRound[],
    candidates: candidates.data as Candidate[],
    decisions: strip<RoundDecision>(decisions.data!),
    joining: strip<JoiningDetails>(joining.data!),
    messages: strip<Message>(messages.data!),
    appUrl: window.location.origin,
  };
}
