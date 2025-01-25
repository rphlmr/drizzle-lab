import { Separator } from "@repo/ui/components/separator";
import { createPortal } from "react-dom";

const id = "toolbar";

export function Toolbar({ children }: { children: React.ReactNode }) {
  const outlet = document.getElementById(id);

  if (!outlet) {
    return null;
  }

  return createPortal(
    <>
      {children}
      <Separator orientation="vertical" className="dzl-mx-2 dzl-h-6" />
    </>,
    outlet,
  );
}

export function ToolbarOutlet({ className }: { className?: string }) {
  return <div id={id} className={className} />;
}
