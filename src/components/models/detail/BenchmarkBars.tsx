import type { Benchmark } from "@/lib/domain/types";

/** Editorial, monochrome benchmark bars - no axes, no legend, no color. */
export function BenchmarkBars({ benchmarks }: { benchmarks: Benchmark[] }) {
  if (benchmarks.length === 0) {
    return <p className="text-[15px] text-ink-4">No benchmarks published for this model.</p>;
  }
  return (
    <div>
      {benchmarks.map((b) => (
        <div key={b.name} className="flex h-8 items-center gap-[14px]">
          <span className="w-[150px] flex-none text-[15px] text-ink-2">{b.name}</span>
          <span className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-border-2">
            <span
              className="block h-full rounded-[3px] bg-ink-3"
              style={{ width: `${Math.min(100, (b.score / b.max) * 100)}%` }}
            />
          </span>
          <span className="w-[52px] flex-none text-right text-[15px] text-ink">{b.score}</span>
        </div>
      ))}
    </div>
  );
}
