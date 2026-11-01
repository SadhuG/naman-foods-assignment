import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { friendlyError } from "../../lib/api/errors";
import { Banner } from "./Banner";
import { Button } from "./Button";

/** Error state for a data view: friendly copy plus Retry. */
export function QueryError({
  error,
  onRetry,
  title,
  children,
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <Banner tone="danger" title={title ?? friendlyError(error)}>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden className="size-4" /> Retry
        </Button>
        {children}
      </div>
    </Banner>
  );
}
