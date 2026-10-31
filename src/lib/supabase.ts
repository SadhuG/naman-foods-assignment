import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { readEnv } from "./env";

export const env = readEnv(import.meta.env);

export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: { persistSession: true, autoRefreshToken: true },
  },
);
