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

export async function decide(
  ids: string[],
  decision: Decision,
  note?: string,
  candidateMessage?: string,
): Promise<{ moved: number; skipped: number }> {
  const { data, error } = await supabase.rpc("hr_decide", {
    p_candidate_ids: ids,
    p_decision: decision,
    p_note: note || undefined,
    p_candidate_message: candidateMessage || undefined,
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
        () => {
          queryClient.invalidateQueries({
            queryKey: pipelineKeys.list(driveId),
          });
          queryClient.invalidateQueries({ queryKey: ["drives"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [driveId, queryClient]);
}
