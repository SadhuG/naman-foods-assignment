import { describe, expect, it } from "vitest";
import { DEFAULT_DEMO_PASSWORD } from "../../../src/lib/demo";
import { readEnv } from "../../../src/lib/env";

const url = "https://abc.supabase.co";
const key = "anon-key";

describe("readEnv", () => {
  it("returns url and key when both are set", () => {
    expect(
      readEnv({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key }),
    ).toEqual({
      supabaseUrl: url,
      supabaseAnonKey: key,
      demoPassword: DEFAULT_DEMO_PASSWORD,
    });
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

  it("falls back to the Vercel–Supabase integration names", () => {
    expect(
      readEnv({
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      }),
    ).toEqual({
      supabaseUrl: url,
      supabaseAnonKey: key,
      demoPassword: DEFAULT_DEMO_PASSWORD,
    });
  });

  it("prefers the VITE_ names over the integration names", () => {
    expect(
      readEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: key,
        NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "other",
      }),
    ).toEqual({
      supabaseUrl: url,
      supabaseAnonKey: key,
      demoPassword: DEFAULT_DEMO_PASSWORD,
    });
  });

  it("ignores blank values and moves to the next name", () => {
    expect(
      readEnv({
        VITE_SUPABASE_URL: "  ",
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
      }),
    ).toEqual({
      supabaseUrl: url,
      supabaseAnonKey: key,
      demoPassword: DEFAULT_DEMO_PASSWORD,
    });
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

  it("falls back to the built-in demo password when VITE_DEMO_PASSWORD is blank", () => {
    expect(
      readEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: key,
        VITE_DEMO_PASSWORD: " ",
      }).demoPassword,
    ).toBe(DEFAULT_DEMO_PASSWORD);
  });
});
