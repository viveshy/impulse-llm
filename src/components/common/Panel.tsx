import type { ReactNode } from "react";
import { clsx } from "@/lib/utils/clsx";

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={clsx("mb-[14px] text-[15px] uppercase tracking-[0.06em] text-ink-3", className)}>
      {children}
    </h3>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-[10px] border border-border px-[15px] py-[4px]", className)}>
      {children}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-2 py-[10px] text-[15px] last:border-0">
      <span className="text-ink-3">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}
