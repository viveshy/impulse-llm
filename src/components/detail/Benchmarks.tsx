import type { Benchmark } from "@/lib/domain/types";

/** One bar per benchmark, scaled to the benchmark's own maximum. */
export function Benchmarks({ items }: { items: Benchmark[] }) {
  return (
    <ul className="space-y-3 rounded-[12px] border border-border bg-panel p-4 shadow-[var(--shadow)]">
      {items.map((b) => {
        const share = b.max > 0 ? Math.max(0, Math.min(1, b.score / b.max)) : 0;
        const value = b.max === 100 ? `${b.score.toFixed(1)}%` : `${b.score} / ${b.max}`;
        return (
          <li key={b.name} className="grid grid-cols-[minmax(110px,180px)_1fr_auto] items-center gap-3">
            <span className="truncate text-[14px] text-ink-2" title={b.name}>
              {b.name}
            </span>
            <span className="h-[10px] rounded-[4px] bg-sunken" aria-hidden>
              <span className="block h-full rounded-[4px] bg-accent" style={{ width: `${share * 100}%` }} />
            </span>
            <span className="w-[72px] text-right text-[14px] font-medium text-ink">{value}</span>
          </li>
        );
      })}
    </ul>
  );
}
