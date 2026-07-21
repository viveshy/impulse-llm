import Link from "next/link";
import type { Model } from "@/lib/domain/types";
import { BADGE_PRIORITY } from "@/lib/domain/capabilities";
import { formatTokens, splitPrice } from "@/lib/utils/format";
import { StatusDot } from "@/components/common/StatusDot";
import { CapabilityBadge } from "@/components/common/CapabilityBadge";

/** Compact model list scoped to a provider (no Provider column - it's implied). */
const GRID =
  "grid grid-cols-[minmax(0,1fr)_78px_84px_84px_minmax(120px,1.2fr)] items-center gap-4 px-[15px]";

function Money({ value }: { value: number | null }) {
  const { symbol, value: v } = splitPrice(value);
  return (
    <>
      <span className="text-ink-3">{symbol}</span>
      {v}
    </>
  );
}

export function ProviderModels({ models }: { models: Model[] }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border">
      <div className={`${GRID} h-8 border-b border-border text-[12px] uppercase tracking-[0.1em] text-ink-4`}>
        <span>Model</span>
        <span className="text-right">Context</span>
        <span className="text-right">Input</span>
        <span className="text-right">Output</span>
        <span>Capabilities</span>
      </div>
      {models.map((m) => {
        const caps = BADGE_PRIORITY.filter((k) => m.capabilities[k]).slice(0, 3);
        return (
          <Link
            key={m.id}
            href={`/app/models/${m.id}`}
            className={`${GRID} h-11 border-b border-border-2 transition-colors last:border-0 hover:bg-hover`}
          >
            <span className="flex min-w-0 items-center gap-[9px]">
              <StatusDot status={m.deprecation} />
              <span className="truncate text-[15px]">{m.name}</span>
              {m.openness.isOpenWeights && (
                <span className="flex-none rounded-[3px] border border-border-strong px-[4px] py-px text-[12px] uppercase tracking-[0.06em] text-ink-3">
                  Open
                </span>
              )}
            </span>
            <span className="text-right text-[15px]">{formatTokens(m.context.contextWindow)}</span>
            <span className="text-right text-[15px]">
              <Money value={m.pricing.inputPerMTok} />
            </span>
            <span className="text-right text-[15px]">
              <Money value={m.pricing.outputPerMTok} />
            </span>
            <span className="flex items-center gap-[5px] overflow-hidden">
              {caps.map((k) => (
                <CapabilityBadge key={k} capability={k} />
              ))}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
