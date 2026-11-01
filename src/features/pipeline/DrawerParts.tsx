import type { ReactNode } from "react";

export function DrawerSection({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border-default pt-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-title">{title}</h3>
        {aside && <span className="text-small text-fg-secondary">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function DefinitionList({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2 text-body">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-small leading-[22px] text-fg-secondary">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
