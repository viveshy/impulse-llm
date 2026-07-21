import Link from "next/link";
import type { Model } from "@/lib/domain/types";
import { formatTokens, splitPrice } from "@/lib/utils/format";
import { StatusDot } from "@/components/common/StatusDot";

function Money({ value }: { value: number | null }) {
  const { symbol, value: v } = splitPrice(value);
  return (
    <>
      <span className="text-ink-3">{symbol}</span>
      {v}
    </>
  );
}

export function RelatedModels({
  models,
  providerName,
}: {
  models: Model[];
  providerName: Map<string, string>;
}) {
  if (models.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-[10px] border border-border">
      {models.map((m) => (
        <Link
          key={m.id}
          href={`/app/models/${m.id}`}
          className="grid grid-cols-[1fr_120px_88px_90px] items-center gap-[14px] border-b border-border-2 px-[15px] py-0 transition-colors last:border-0 hover:bg-hover"
          style={{ height: 42 }}
        >
          <span className="flex items-center gap-[9px] text-[15px]">
            <StatusDot status={m.deprecation} />
            {m.name}
          </span>
          <span className="text-[15px] text-ink-3">{providerName.get(m.providerId)}</span>
          <span className="text-right text-[15px]">{formatTokens(m.context.contextWindow)}</span>
          <span className="text-right text-[15px]">
            <Money value={m.pricing.inputPerMTok} />
          </span>
        </Link>
      ))}
    </div>
  );
}
