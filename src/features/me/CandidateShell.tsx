import { Inbox, LogOut } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { Avatar, initials, Wordmark } from "../../components/ui/Brand";
import { cn } from "../../components/ui/cn";
import { signOut, useAuth } from "../../lib/api/auth";

function displayName(meta: Record<string, unknown> | undefined, email: string) {
  const name = typeof meta?.name === "string" ? meta.name.trim() : "";
  return name || email.split("@")[0]!;
}

export function useDisplayName(): string {
  const { session } = useAuth();
  if (!session) return "";
  return displayName(session.user.user_metadata, session.user.email ?? "");
}

/** Top bar for candidate pages. Signed out it shows only the wordmark. */
export function CandidateTopBar({ unread }: { unread?: boolean }) {
  const { session, role } = useAuth();
  const name = useDisplayName();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !menu.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const candidate = session && role === "candidate";
  return (
    <header className="sticky top-0 z-30 border-b border-border-default bg-surface-raised">
      <div className="mx-auto flex h-17 max-w-6xl items-center gap-2 px-4 lg:px-16">
        <Wordmark to={candidate ? "/me" : role === "hr" ? "/drives" : "/"} />
        <div className="flex-1" />
        {candidate && (
          <>
            <nav aria-label="Candidate" className="hidden gap-1 sm:flex">
              {[
                ["/me", "Applications"],
                ["/me/inbox", "Inbox"],
              ].map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/me"}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-1.5 text-label",
                      isActive
                        ? "bg-surface-sunken"
                        : "text-fg-secondary hover:text-fg-primary",
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <Link
              to="/me/inbox"
              aria-label={unread ? "Inbox, new messages" : "Inbox"}
              className="relative grid size-11 place-items-center rounded-md hover:bg-surface-sunken sm:hidden"
            >
              <Inbox className="size-5" />
              {unread && (
                <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-accent-brand" />
              )}
            </Link>
            <div ref={menu} className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${initials(name)}: account menu for ${name}`}
                className="grid size-11 place-items-center rounded-full"
              >
                <Avatar name={name} />
              </button>
              {open && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-border-default bg-surface-raised p-1 shadow-lg"
                >
                  <p className="truncate px-3 py-2 text-small text-fg-secondary">
                    {session.user.email}
                  </p>
                  <button
                    role="menuitem"
                    onClick={async () => {
                      await signOut();
                      navigate("/login", { replace: true });
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-label hover:bg-surface-sunken"
                  >
                    <LogOut aria-hidden className="size-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export function CandidateShell({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh">
      <CandidateTopBar />
      <main
        className={cn(
          "mx-auto px-4 pt-6 pb-12",
          wide ? "max-w-6xl lg:px-16 lg:pt-12" : "max-w-xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}
