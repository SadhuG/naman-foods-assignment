import { Overlay, type OverlayProps } from "./Overlay";

export function Dialog(props: OverlayProps) {
  return <Overlay kind="dialog" {...props} />;
}

export function Drawer(props: OverlayProps) {
  return <Overlay kind="drawer" {...props} />;
}
