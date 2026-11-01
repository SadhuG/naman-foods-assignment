import type { ApplyInput } from "../schemas";
import { supabase } from "../supabase";
import type {
  MyApplication,
  MyApplicationSummary,
  PublicDrive,
} from "../types";

export async function getPublicDrive(
  slug: string,
): Promise<PublicDrive | null> {
  const { data, error } = await supabase.rpc("get_public_drive", {
    p_slug: slug,
  });
  if (error) throw error;
  return (data as unknown as PublicDrive | null) ?? null;
}

export async function applyToDrive(
  slug: string,
  input: ApplyInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("apply_to_drive", {
    p_slug: slug,
    p_full_name: input.full_name,
    p_phone: input.phone,
    p_city: input.city,
    p_qualification: input.qualification,
    p_experience_years: input.experience_years,
  });
  if (error) throw error;
  return data as string;
}

export async function listMyApplications(): Promise<MyApplicationSummary[]> {
  const { data, error } = await supabase.rpc("list_my_applications");
  if (error) throw error;
  return (data as unknown as MyApplicationSummary[]) ?? [];
}

export async function getMyApplication(id: string): Promise<MyApplication> {
  const { data, error } = await supabase.rpc("get_my_application", {
    p_candidate_id: id,
  });
  if (error) throw error;
  return data as unknown as MyApplication;
}

/** Profile from the candidate's latest application, to prefill the next one. */
export async function getMyLatestProfile() {
  const { data, error } = await supabase
    .from("candidates")
    .select("full_name, email, phone, city, qualification, experience_years")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const candidateKeys = {
  drive: (slug: string) => ["public-drive", slug] as const,
  mine: ["my-applications"] as const,
  one: (id: string) => ["my-application", id] as const,
  profile: ["my-profile"] as const,
};
