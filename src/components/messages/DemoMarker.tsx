import type { ReactNode } from "react";

/** Amber "DEMO · NOT ACTUALLY SENT" marker (Figma DemoMarker). */
export function DemoMarker({
  children = "Demo · not actually sent",
}: {
  children?: ReactNode;
}) {
  return (
    <span className="inline-flex h-5.5 shrink-0 items-center rounded-sm bg-demo-bg px-2 font-mono text-caption whitespace-nowrap text-demo-fg uppercase">
      {children}
    </span>
  );
}
