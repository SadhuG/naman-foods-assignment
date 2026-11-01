import { cn } from "./cn";

export type TabItem = { key: string; label: string; count?: number };

export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-6 overflow-x-auto border-b border-border-default"
    >
      {items.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 py-3 text-label whitespace-nowrap",
              on
                ? "border-accent-brand text-fg-primary"
                : "border-transparent text-fg-secondary hover:text-fg-primary",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 text-small tabular-nums",
                  on
                    ? "bg-accent-soft text-accent-default"
                    : "bg-surface-sunken text-fg-secondary",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
