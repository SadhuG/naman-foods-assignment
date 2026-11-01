import { LoaderCircle } from "lucide-react";
import { cn } from "./cn";

export function Spinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <LoaderCircle
      aria-label={label}
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("size-4 animate-spin", className)}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="grid min-h-60 place-items-center text-fg-secondary">
      <Spinner label="Loading" className="size-6" />
    </div>
  );
}
