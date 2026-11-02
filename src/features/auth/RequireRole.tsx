import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { PageSpinner } from "../../components/ui/Spinner";
import { useAuth, type Role } from "../../lib/api/auth";

export const homeFor = (role: Role) => (role === "hr" ? "/drives" : "/me");

/** Signed-out visitors go to /login?next=…; the wrong role goes to its own home. */
export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <PageSpinner />;
  if (!auth.session || !auth.role) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (auth.role !== role) return <Navigate to={homeFor(auth.role)} replace />;
  return children;
}

/** Only follow same-site paths from ?next=. */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}
