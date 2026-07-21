import type { ReactNode } from "react";

export interface Metric {
  label: string;
  value: ReactNode;
}

/**
 * Stripe-style flat, bordered, divided metric cells. Dividers are rendered as
 * 1px gaps over the border color, so it wraps cleanly at any column count.
 */
export function MetricsStrip({ items }: { items: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="bg-bg px-[15px] py-[13px]">
          <div className="text-[12px] uppercase tracking-[0.1em] text-ink-4">{item.label}</div>
          <div className="mt-[7px] text-[19px] font-medium tracking-[-0.02em]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
