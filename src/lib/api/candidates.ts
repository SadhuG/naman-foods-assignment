import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../supabase";
import type {
  Candidate,
  Decision,
  JoiningDetails,
  Message,
  RoundDecision,
} from "../types";

export const pipelineKeys = {
  list: (driveId: string) => ["candidates", driveId] as const,
  detail: (id: string) => ["candidate", id] as const,
};

export async function listCandidates(driveId: string): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("drive_id", driveId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Candidate[];
}

/**
 * Decides for these candidates as HR last saw them. Anyone whose round or status has
 * changed since (another HR person got there first) is skipped by the server.
 */
export async function decide(
  seen: Array<Pick<Candidate, "id" | "current_round" | "status">>,
  decision: Decision,
  note?: string,
  candidateMessage?: string,
): Promise<{ moved: number; skipped: number }> {
  const { data, error } = await supabase.rpc("hr_decide", {
    p_candidate_ids: seen.map((c) => c.id),
    p_decision: decision,
    p_note: note || undefined,
    p_candidate_message: candidateMessage || undefined,
    p_expected: Object.fromEntries(
      seen.map((c) => [c.id, { round: c.current_round, status: c.status }]),
    ),
  });
  if (error) throw error;
  return data as { moved: number; skipped: number };
}

export type CandidateDetail = {
  candidate: Candidate;
  decisions: RoundDecision[];
  joining: JoiningDetails | null;
  messages: Message[];
};

export async function getCandidateDetail(id: string): Promise<CandidateDetail> {
  const [c, d, j, m] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("round_decisions")
      .select("*")
      .eq("candidate_id", id)
      .order("decided_at"),
    supabase
      .from("joining_details")
      .select("*")
      .eq("candidate_id", id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("*")
      .eq("candidate_id", id)
      .order("created_at"),
  ]);
  for (const r of [c, d, j, m]) if (r.error) throw r.error;
  if (!c.data) throw new Error("application_not_found");
  return {
    candidate: c.data as Candidate,
    decisions: d.data as RoundDecision[],
    joining: j.data as JoiningDetails | null,
    messages: m.data as unknown as Message[],
  };
}

/** Live arrivals and status changes for one drive: refetch on any candidates change. */
export function useCandidatesLive(driveId: string): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!driveId) return;
    // A bulk decision sends one event per candidate (50 for a full drive). Invalidating on
    // each would cancel the reload in flight every time, so the list never updated until
    // the stream ended. Instead: let a reload finish, then do one more if events arrived.
    let running = false;
    let again = false;
    const refresh = async () => {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          await Promise.all([
            queryClient.invalidateQueries(
              { queryKey: pipelineKeys.list(driveId) },
              { cancelRefetch: false },
            ),
            queryClient.invalidateQueries(
              { queryKey: ["drives"] },
              { cancelRefetch: false },
            ),
          ]);
        } while (again);
      } finally {
        running = false;
      }
    };
    const channel = supabase
      .channel(`candidates-${driveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "candidates",
          filter: `drive_id=eq.${driveId}`,
        },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [driveId, queryClient]);
}

export async function requestChanges(
  candidateId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("hr_request_changes", {
    p_candidate_id: candidateId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function markOnboarded(candidateId: string): Promise<void> {
  const { error } = await supabase.rpc("hr_mark_onboarded", {
    p_candidate_id: candidateId,
  });
  if (error) throw error;
}

/** Joining-details progress for the Selected tab, keyed by candidate id. */
export async function listChangeRequests(
  driveId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("joining_details")
    .select(
      "candidate_id, changes_requested_reason, candidates!inner(drive_id)",
    )
    .eq("candidates.drive_id", driveId)
    .not("changes_requested_reason", "is", null);
  if (error) throw error;
  return new Set(data.map((r) => r.candidate_id));
}
