import type { ReactNode } from "react";
import { clsx } from "@/lib/utils/clsx";

export function StatTile({
  label,
  value,
  sub,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("min-w-0 rounded-[12px] border border-border bg-panel px-4 py-[14px]", className)}>
      <div className="text-[13px] text-ink-3">{label}</div>
      <div className="mt-[3px] truncate text-[22px] font-semibold tracking-[-0.02em] text-ink">{value}</div>
      {sub && <div className="mt-[2px] text-[13px] leading-[1.4] text-ink-3">{sub}</div>}
    </div>
  );
}
