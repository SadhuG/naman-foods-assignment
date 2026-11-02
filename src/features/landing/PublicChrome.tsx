import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { buttonClass } from "../../components/ui/Button";
import { Wordmark } from "../../components/ui/Brand";
import { cn } from "../../components/ui/cn";

/** Page frame for the public landing and notes pages: same width and gutters as Figma (1440, 80 px). */
export const pageX = "mx-auto w-full max-w-[1440px] px-5 lg:px-20";

export function PublicShell({
  children,
  footerLink,
}: {
  children: ReactNode;
  footerLink: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className={cn(pageX, "flex items-center gap-6 py-4 lg:py-5")}>
        <Wordmark to="/" />
        <div className="flex-1" />
        <nav aria-label="Site" className="flex items-center gap-6">
          <NavLink
            to="/notes"
            className={({ isActive }) =>
              cn(
                "hidden text-label hover:underline sm:inline",
                isActive ? "text-fg-link" : "text-fg-primary",
              )
            }
          >
            Submission notes
          </NavLink>
          <Link to="/login" className={buttonClass("secondary")}>
            Sign in
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border-default">
        <div
          className={cn(
            pageX,
            "flex flex-col gap-3 pt-6 pb-8 lg:flex-row lg:items-center lg:justify-between lg:pt-8 lg:pb-10",
          )}
        >
          <p className="text-small text-fg-secondary">
            Shortlist by Naman Foods. Built in 24 hours for the bulk-hiring
            assignment, November 2026.
          </p>
          {footerLink}
        </div>
      </footer>
    </div>
  );
}

/** Footer link on each page points to the other page. */
export function PublicLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="text-label text-fg-link hover:underline">
      {children}
    </Link>
  );
}
