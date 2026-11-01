import type { Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { queryClient } from "../queryClient";
import type { AccountInput } from "../schemas";
import { supabase } from "../supabase";

export type Role = "hr" | "candidate";
export type AuthState = {
  session: Session | null;
  role: Role | null;
  loading: boolean;
};

// One module-level store, so every component reads the same session without a provider.
let state: AuthState = { session: null, role: null, loading: true };
const listeners = new Set<() => void>();
const set = (next: AuthState) => {
  state = next;
  listeners.forEach((l) => l());
};

// One lookup per user, shared by every caller, so concurrent sign-in events agree.
const roles = new Map<string, Promise<Role>>();
function roleFor(session: Session | null): Promise<Role | null> {
  if (!session) return Promise.resolve(null);
  const id = session.user.id;
  let role = roles.get(id);
  if (!role) {
    // RLS lets a user read only their own hr_users row.
    role = Promise.resolve(
      supabase
        .from("hr_users")
        .select("user_id")
        .eq("user_id", id)
        .maybeSingle(),
    ).then(({ data, error }) => {
      if (error) {
        roles.delete(id);
        throw error;
      }
      return data ? "hr" : "candidate";
    });
    roles.set(id, role);
  }
  return role;
}

let resolving = 0;
async function apply(session: Session | null) {
  const ticket = ++resolving;
  if (state.session?.user.id === session?.user.id && state.role) {
    set({ session, role: state.role, loading: false });
    return;
  }
  set({ ...state, loading: true });
  let role: Role | null = null;
  try {
    role = await roleFor(session);
  } catch {
    // Treat a failed lookup as signed out; the login page lets them retry.
    session = null;
  }
  if (ticket === resolving) set({ session, role, loading: false });
}

let started = false;
function start() {
  if (started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => apply(data.session));
  supabase.auth.onAuthStateChange((_event, session) => {
    // Supabase warns against awaiting other calls inside this callback.
    setTimeout(() => apply(session), 0);
  });
}

export function useAuth(): AuthState {
  start();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** Waits until the session and role are known (used right after sign-in). */
export function whenAuthReady(): Promise<AuthState> {
  start();
  if (!state.loading) return Promise.resolve(state);
  return new Promise((resolve) => {
    const l = () => {
      if (state.loading) return;
      listeners.delete(l);
      resolve(state);
    };
    listeners.add(l);
  });
}

export async function signIn(email: string, password: string): Promise<Role> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  queryClient.clear();
  const role = (await roleFor(data.session))!;
  await apply(data.session);
  return role;
}

export async function signUp(
  input: AccountInput & { full_name?: string },
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { name: input.full_name } },
  });
  if (error) throw error;
  // With email confirmation off, an existing address comes back with no identities.
  if (!data.session || data.user?.identities?.length === 0) {
    throw new Error("User already registered");
  }
  // Sign-up starts signed out: keep the public drive the form is showing.
  queryClient.removeQueries({
    predicate: (q) => q.queryKey[0] !== "public-drive",
  });
  await apply(data.session);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  roles.clear();
  queryClient.clear();
  await apply(null);
}
