import Link from "next/link";
import type { Model } from "@/lib/domain/types";
import { BADGE_PRIORITY } from "@/lib/domain/capabilities";
import { formatTokens, splitPrice } from "@/lib/utils/format";
import { StatusDot } from "@/components/common/StatusDot";
import { CapabilityBadge } from "@/components/common/CapabilityBadge";

/** Shared column template so the header and every row align exactly. */
export const ROW_GRID =
  "grid grid-cols-[minmax(200px,1.3fr)_minmax(120px,0.9fr)_80px_88px_88px_minmax(220px,1.7fr)] items-center gap-4 px-5";

function Money({ value }: { value: number | null }) {
  const { symbol, value: v } = splitPrice(value);
  return (
    <span className={value === null ? "text-ink-3" : undefined}>
      <span className="text-ink-3">{symbol}</span>
      {v}
    </span>
  );
}

export function ModelRow({ model, providerName }: { model: Model; providerName: string }) {
  const caps = BADGE_PRIORITY.filter((k) => model.capabilities[k]);
  const shown = caps.slice(0, 3);
  const extra = caps.length - shown.length;

  return (
    <Link
      href={`/app/models/${model.id}`}
      className={`${ROW_GRID} h-11 border-b border-border-2 transition-colors hover:bg-hover`}
    >
      <div className="flex min-w-0 items-center gap-[10px]">
        <StatusDot status={model.deprecation} />
        <span className="truncate text-[15px] text-ink">{model.name}</span>
        {model.openness.isOpenWeights && (
          <span className="flex-none rounded-[3px] border border-border-strong px-[4px] py-px text-[12px] uppercase tracking-[0.06em] text-ink-3">
            Open
          </span>
        )}
      </div>
      <div className="truncate text-[15px] text-ink-3">{providerName}</div>
      <div className="text-right text-[15px]">{formatTokens(model.context.contextWindow)}</div>
      <div className="text-right text-[15px]">
        <Money value={model.pricing.inputPerMTok} />
      </div>
      <div className="text-right text-[15px]">
        <Money value={model.pricing.outputPerMTok} />
      </div>
      <div className="flex items-center gap-[5px] overflow-hidden">
        {shown.map((k) => (
          <CapabilityBadge key={k} capability={k} />
        ))}
        {extra > 0 && <span className="text-[13px] text-ink-4">+{extra}</span>}
      </div>
    </Link>
  );
}
