import { describe, expect, it } from "vitest";
import { readEnv } from "./env";

const url = "https://abc.supabase.co";
const key = "anon-key";

describe("readEnv", () => {
  it("returns url and key when both are set", () => {
    expect(
      readEnv({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key }),
    ).toEqual({ supabaseUrl: url, supabaseAnonKey: key });
  });

  it("throws when the URL is missing", () => {
    expect(() => readEnv({ VITE_SUPABASE_ANON_KEY: key })).toThrow(
      "Missing VITE_SUPABASE_URL",
    );
  });

  it("throws when the anon key is missing", () => {
    expect(() => readEnv({ VITE_SUPABASE_URL: url })).toThrow(
      "Missing VITE_SUPABASE_ANON_KEY",
    );
  });

  it("includes demoPassword when VITE_DEMO_PASSWORD is set", () => {
    expect(
      readEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: key,
        VITE_DEMO_PASSWORD: "pw",
      }),
    ).toEqual({ supabaseUrl: url, supabaseAnonKey: key, demoPassword: "pw" });
  });
});
