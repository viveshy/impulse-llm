import Link from "next/link";
import type { Model } from "@/lib/domain/types";
import { BADGE_PRIORITY } from "@/lib/domain/capabilities";
import { formatTokens, splitPrice } from "@/lib/utils/format";
import { StatusDot } from "@/components/common/StatusDot";
import { CapabilityBadge } from "@/components/common/CapabilityBadge";
import { ProviderGlyph } from "@/components/common/ProviderGlyph";

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[15px] text-ink">{children}</div>
      <div className="mt-[3px] text-[12px] uppercase tracking-[0.1em] text-ink-4">{label}</div>
    </div>
  );
}

function Money({ value }: { value: number | null }) {
  const { symbol, value: v } = splitPrice(value);
  return (
    <>
      <span className="text-ink-3">{symbol}</span>
      {v}
    </>
  );
}

export function ModelCard({
  model,
  providerName,
  monogram,
}: {
  model: Model;
  providerName: string;
  monogram: string;
}) {
  const caps = BADGE_PRIORITY.filter((k) => model.capabilities[k]).slice(0, 4);

  return (
    <Link
      href={`/app/models/${model.id}`}
      className="flex flex-col rounded-[10px] border border-border bg-panel p-[18px] transition-colors hover:border-border-strong hover:bg-hover"
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-[9px]">
          <ProviderGlyph monogram={monogram} size="sm" />
          <span className="truncate text-[15px] text-ink-3">{providerName}</span>
        </div>
        <StatusDot status={model.deprecation} />
      </div>

      <div className="mt-[14px] truncate text-[17px] font-medium tracking-[-0.02em] text-ink">
        {model.name}
      </div>

      <div className="mt-[14px] flex gap-7 border-y border-border py-[12px]">
        <Cell label="Input / 1M">
          <Money value={model.pricing.inputPerMTok} />
        </Cell>
        <Cell label="Output / 1M">
          <Money value={model.pricing.outputPerMTok} />
        </Cell>
        <Cell label="Context">{formatTokens(model.context.contextWindow)}</Cell>
      </div>

      <div className="mt-[14px] flex flex-wrap gap-[5px]">
        {caps.map((k) => (
          <CapabilityBadge key={k} capability={k} />
        ))}
      </div>
    </Link>
  );
}
