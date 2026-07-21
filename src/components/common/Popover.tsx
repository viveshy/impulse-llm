"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "@/lib/utils/clsx";

export function Popover({
  trigger,
  children,
  align = "left",
  width = 240,
}: {
  trigger: (state: { open: boolean }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="contents">
        {trigger({ open })}
      </button>
      {open && (
        <div
          style={{ minWidth: width }}
          className={clsx(
            "absolute z-40 mt-2 max-h-[60vh] overflow-y-auto rounded-[10px] border border-border-strong bg-elevated p-[6px] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
