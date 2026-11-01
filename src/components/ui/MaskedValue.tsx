import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { maskId } from "../../lib/ids";

const grouped = (v: string) =>
  /^\d{12}$/.test(v) ? v.replace(/(\d{4})(?=\d)/g, "$1 ") : v;

/** An ID number shown masked ("XXXX XXXX 9012"); the eye reveals it. */
export function MaskedValue({
  value,
  label = "number",
}: {
  value: string;
  label?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <span className="inline-flex items-center gap-2 font-mono text-mono">
      <span>{shown ? grouped(value) : maskId(value)}</span>
      <button
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={shown}
        className="rounded-sm p-0.5 text-fg-secondary hover:text-fg-primary"
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}
