import { cn } from "../../components/ui/cn";
import type { FunnelStage } from "../../lib/landing";

// Lightest orange for the most people, Naman orange for the few who make it.
const TONES = [
  "bg-orange-100",
  "bg-orange-200",
  "bg-orange-300",
  "bg-orange-400",
  "bg-orange-500",
];

/**
 * Horizontal funnel: one bar per stage, width proportional to the first stage.
 * The bar track is 48% of the row on phones and 60% from sm up (Figma: 170/350, 300/500).
 * Bars grow once on load unless the visitor prefers reduced motion.
 */
export function FunnelChart({
  stages,
  className,
}: {
  stages: FunnelStage[];
  className?: string;
}) {
  const max = stages[0]?.count ?? 1;
  return (
    <ol
      className={cn(
        "flex flex-col gap-2.5 [--track:48%] sm:gap-3 sm:[--track:60%]",
        className,
      )}
    >
      {stages.map((s, i) => (
        <li key={s.label} className="flex items-center gap-4">
          <span
            aria-hidden
            className={cn(
              "h-12 min-w-2.5 origin-left rounded-sm motion-safe:animate-bar-grow sm:h-15",
              TONES[Math.min(i, TONES.length - 1)],
            )}
            style={{
              width: `calc(var(--track) * ${s.count / max})`,
              animationDelay: `${i * 90}ms`,
            }}
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-doc-heading font-bold tracking-[-0.03em] tabular-nums sm:text-stat">
              {s.count}
            </span>
            <span className="text-small text-fg-secondary">{s.label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
