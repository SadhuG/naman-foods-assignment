import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { Avatar, Wordmark } from "../../components/ui/Brand";
import { cn } from "../../components/ui/cn";
import { signOut } from "../../lib/api/auth";

/** Amber "DEMO · NOT ACTUALLY SENT" marker from the Figma DemoMarker component. */
export function DemoMarker({
  children = "Demo · not actually sent",
}: {
  children?: ReactNode;
}) {
  return (
    <span className="inline-flex h-5.5 items-center rounded-sm bg-demo-bg px-2 font-mono text-caption text-demo-fg uppercase">
      {children}
    </span>
  );
}

export function HrShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onDrives = pathname === "/" || pathname.startsWith("/drives");
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border-default bg-surface-raised">
        <div className="flex h-17 items-center gap-6 px-8">
          <Wordmark to="/" />
          <nav aria-label="HR">
            {/* every HR page lives under Drives */}
            <Link
              to="/"
              aria-current={onDrives ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-label",
                onDrives
                  ? "bg-surface-sunken"
                  : "text-fg-secondary hover:text-fg-primary",
              )}
            >
              Drives
            </Link>
          </nav>
          <div className="flex-1" />
          <DemoMarker />
          <div className="flex items-center gap-2">
            <Avatar name="HR team" dark />
            <span className="text-label">HR team</span>
            <button
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-md p-1.5 text-fg-secondary hover:bg-surface-sunken hover:text-fg-primary"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-8 pt-8 pb-16 xl:px-16">
        {children}
      </main>
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<[label: string, to?: string]>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex items-center gap-2 text-small text-fg-secondary">
        {items.map(([label, to], i) => (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>›</span>}
            {to ? (
              <NavLink to={to} className="text-fg-link hover:underline">
                {label}
              </NavLink>
            ) : (
              <span aria-current="page">{label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
