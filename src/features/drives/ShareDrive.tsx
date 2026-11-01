import { Copy, Link2, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { applyUrl } from "../../lib/api/drives";

export async function copyLink(slug: string) {
  try {
    await navigator.clipboard.writeText(applyUrl(slug));
    toast.success("Apply link copied.");
  } catch {
    toast.error("Couldn't copy. Select the link and copy it yourself.");
  }
}

/** Apply link + QR code for walk-in venues, with a PNG download. */
export function ShareDrive({ slug }: { slug: string | null }) {
  const qr = useRef<HTMLCanvasElement>(null);
  const url = slug ? applyUrl(slug) : null;

  function download() {
    if (!qr.current || !slug) return;
    const a = document.createElement("a");
    a.href = qr.current.toDataURL("image/png");
    a.download = `${slug}-qr.png`;
    a.click();
  }

  return (
    <section className="rounded-lg border border-border-default bg-surface-raised p-5">
      <h2 className="text-title">Share with candidates</h2>
      <p className="mt-1 text-small text-fg-secondary">
        {url
          ? "Candidates open this link to apply."
          : "The link goes live when you create the drive."}
      </p>
      <div className="mt-4 flex gap-2">
        <p className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border-default bg-surface-canvas px-3 font-mono text-small">
          <Link2 aria-hidden className="size-4 shrink-0 text-fg-secondary" />
          <span className="truncate" title={url ?? undefined}>
            {slug ? `…/apply/${slug}` : "…/apply/…"}
          </span>
        </p>
        <Button
          variant="secondary"
          disabled={!slug}
          onClick={() => slug && copyLink(slug)}
        >
          <Copy aria-hidden className="size-4" /> Copy
        </Button>
      </div>
      <div className="mt-3 flex flex-col items-center gap-3 rounded-md bg-surface-canvas p-4">
        {url ? (
          <QRCodeCanvas
            ref={qr}
            value={url}
            size={200}
            marginSize={2}
            title={`QR code for ${url}`}
            role="img"
            aria-label={`QR code for the apply link ${url}`}
          />
        ) : (
          <div className="grid size-50 place-items-center rounded-md border border-dashed border-border-strong text-fg-disabled">
            <QrCode aria-hidden className="size-10" />
          </div>
        )}
        <p className="text-small text-fg-secondary">
          Print this at the plant gate for walk-ins
        </p>
      </div>
      <Button
        variant="secondary"
        className="mt-3 w-full"
        disabled={!url}
        onClick={download}
      >
        <QrCode aria-hidden className="size-4" /> Download QR (PNG)
      </Button>
    </section>
  );
}
