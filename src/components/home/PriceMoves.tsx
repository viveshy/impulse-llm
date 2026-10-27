import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { PriceMove } from "@/lib/catalog/changes";
import { hostLabel } from "@/lib/catalog/detail";
import { modelHref } from "@/lib/routes";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";

const pair = (p: PriceMove["from"]) => `${formatUsd(p.input)} / ${formatUsd(p.output)}`;

export function PriceMoves({ moves }: { moves: PriceMove[] | null }) {
  if (moves === null) {
    return (
      <p className="rounded-[12px] border border-border bg-panel p-4 text-[14px] text-ink-3">
        Price history is unavailable right now.
      </p>
    );
  }
  if (!moves.length) {
    return (
      <p className="rounded-[12px] border border-border bg-panel p-4 text-[14px] text-ink-3">
        No list-price changes in the last 30 days.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border-2 rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]">
      {moves.map((m) => {
        const cut = m.change < 0;
        return (
          <li key={`${m.model.slug}|${m.listing.hostId}`} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link href={modelHref(m.model)} className="font-medium text-ink hover:text-accent hover:underline">
                {m.model.name}
              </Link>
              <div className="truncate text-[13px] text-ink-3">
                {hostLabel(m.listing)} · {formatDate(m.at)}
              </div>
              <div className="mt-[2px] text-[13px] text-ink-3">
                <span className="line-through decoration-ink-4">{pair(m.from)}</span>
                <span className="mx-1">→</span>
                <span className="text-ink">{pair(m.to)}</span>
              </div>
            </div>
            <Badge
              tone={cut ? "ok" : "err"}
              icon={cut ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              title="Change in blended price (3 parts input to 1 part output)"
            >
              {cut ? "−" : "+"}
              {Math.abs(Math.round(m.change * 100))}%
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
