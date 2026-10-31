export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  demoPassword?: string;
};

export function readEnv(source: Record<string, string | undefined>): AppEnv {
  const supabaseUrl = source.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = source.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl) throw new Error("Missing VITE_SUPABASE_URL");
  if (!supabaseAnonKey) throw new Error("Missing VITE_SUPABASE_ANON_KEY");
  const demoPassword = source.VITE_DEMO_PASSWORD?.trim();
  return demoPassword
    ? { supabaseUrl, supabaseAnonKey, demoPassword }
    : { supabaseUrl, supabaseAnonKey };
}
