import { createClient } from "@supabase/supabase-js";
import { readEnv } from "./env";

export const env = readEnv(import.meta.env);

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
