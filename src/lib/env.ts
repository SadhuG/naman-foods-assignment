import { DEFAULT_DEMO_PASSWORD } from "./demo";

export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  demoPassword?: string;
};

type Source = Record<string, string | undefined>;

/** First non-empty value among `names`. */
function pick(source: Source, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = source[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

// Our own VITE_ names come first. The NEXT_PUBLIC_ names are the ones the
// Vercel ↔ Supabase integration syncs (exposed through `envPrefix` in vite.config.ts).
const URL_NAMES = ["VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"] as const;
const KEY_NAMES = [
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function readEnv(source: Source): AppEnv {
  const supabaseUrl = pick(source, URL_NAMES);
  const supabaseAnonKey = pick(source, KEY_NAMES);
  if (!supabaseUrl)
    throw new Error(`Missing VITE_SUPABASE_URL (or ${URL_NAMES[1]})`);
  if (!supabaseAnonKey)
    throw new Error(
      `Missing VITE_SUPABASE_ANON_KEY (or ${KEY_NAMES.slice(1).join(", ")})`,
    );
  const demoPassword =
    pick(source, ["VITE_DEMO_PASSWORD"]) ?? DEFAULT_DEMO_PASSWORD;
  return { supabaseUrl, supabaseAnonKey, demoPassword };
}
