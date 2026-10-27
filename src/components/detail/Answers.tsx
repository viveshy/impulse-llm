import type { Answer } from "@/lib/seo";

/** Short answers to what people ask about a model; its structured data carries the same ones. */
export function Answers({ items }: { items: Answer[] }) {
  return (
    <div className="divide-y divide-border-2 rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]">
      {items.map((x) => (
        <div key={x.q} className="px-4 py-3">
          <h3 className="text-[15px] font-medium text-ink">{x.q}</h3>
          <p className="mt-1 max-w-[80ch] text-[14.5px] leading-[1.6] text-ink-2">{x.a}</p>
        </div>
      ))}
    </div>
  );
}
