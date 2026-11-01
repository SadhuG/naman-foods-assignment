import { supabase } from "../supabase";
import type { CandidateStatus, Message } from "../types";

/** A message plus who it went to (for the To line and the SMS number). */
export type AddressedMessage = Message & {
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  candidate_status: CandidateStatus;
};

type Row = Message & {
  candidates: {
    full_name: string;
    email: string;
    phone: string;
    status: CandidateStatus;
  };
};

const toAddressed = (r: Row): AddressedMessage => {
  const { candidates: c, ...m } = r;
  return {
    ...m,
    candidate_name: c.full_name,
    candidate_email: c.email,
    candidate_phone: c.phone,
    candidate_status: c.status,
  };
};

/** The signed-in candidate's messages, newest first (RLS limits them to their own). */
export async function listMyMessages(): Promise<AddressedMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*, candidates!inner(full_name, email, phone, status, user_id)")
    .order("created_at", { ascending: false })
    .order("id");
  if (error) throw error;
  return (data as unknown as Row[]).map(toAddressed);
}

/** Every message for one drive, newest first (HR only). */
export async function listDriveMessages(
  driveId: string,
): Promise<AddressedMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*, candidates!inner(full_name, email, phone, status, drive_id)")
    .eq("candidates.drive_id", driveId)
    .order("created_at", { ascending: false })
    .order("id");
  if (error) throw error;
  return (data as unknown as Row[]).map(toAddressed);
}

export const messageKeys = {
  mine: ["my-messages"] as const,
  drive: (driveId: string) => ["drive-messages", driveId] as const,
};
