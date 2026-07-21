import Link from "next/link";
import { Check, X } from "lucide-react";
import type { Alternative } from "@/lib/alternatives";
import { formatPrice, formatTokens } from "@/lib/utils/format";
import { Tag } from "@/components/common/CapabilityBadge";
import { ProviderGlyph } from "@/components/common/ProviderGlyph";
import { CommandBlock } from "@/components/common/CommandBlock";

const btn =
  "inline-flex h-[28px] items-center rounded-[6px] border border-border px-[11px] text-[13px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="text-ink-3">
      {label} <span className="text-ink">{children}</span>
    </span>
  );
}

export function AlternativeCard({
  alt,
  baseId,
  providerName,
  monogram,
}: {
  alt: Alternative;
  baseId: string;
  providerName: string;
  monogram: string;
}) {
  const m = alt.model;
  const license = m.openness.isOpenWeights ? (m.openness.license ?? "Open weights") : "Proprietary";

  return (
    <div className="rounded-[10px] border border-border bg-panel p-[18px] transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-[9px]">
            <ProviderGlyph monogram={monogram} size="sm" />
            <span className="text-[13px] text-ink-3">{providerName}</span>
            {m.openness.isOpenWeights && <Tag>Open</Tag>}
          </div>
          <Link
            href={`/app/models/${m.id}`}
            className="mt-[10px] block text-[17px] font-medium tracking-[-0.02em] text-ink hover:text-accent"
          >
            {m.name}
          </Link>
        </div>
        <div className="flex-none text-right">
          <div className="text-[21px] font-medium tabular-nums text-ink">{alt.score}%</div>
          <div className="text-[11px] uppercase tracking-[0.1em] text-ink-4">match</div>
        </div>
      </div>

      <div className="mt-[14px] flex flex-wrap gap-x-5 gap-y-[6px] text-[13px]">
        <Fact label="Input">{formatPrice(m.pricing.inputPerMTok)}</Fact>
        <Fact label="Context">{formatTokens(m.context.contextWindow)}</Fact>
        <Fact label="Deploy">{alt.deployment.label}</Fact>
        <Fact label="License">{license}</Fact>
      </div>

      {m.tags && m.tags.length > 0 && (
        <div className="mt-[14px] flex flex-wrap gap-[5px]">
          {m.tags.slice(0, 5).map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
        </div>
      )}

      {(alt.gains.length > 0 || alt.losses.length > 0) && (
        <div className="mt-[16px] grid grid-cols-1 gap-x-6 gap-y-[6px] sm:grid-cols-2">
          {alt.gains.map((g) => (
            <div key={g} className="flex items-center gap-[9px] text-[13px] text-ink-2">
              <Check size={14} className="flex-none text-ink-2" strokeWidth={2.4} />
              {g}
            </div>
          ))}
          {alt.losses.map((l) => (
            <div key={l} className="flex items-center gap-[9px] text-[13px] text-ink-4">
              <X size={14} className="flex-none text-ink-4" strokeWidth={2.4} />
              {l}
            </div>
          ))}
        </div>
      )}

      {alt.quickStart && (
        <div className="mt-[16px]">
          <div className="mb-[8px] text-[11px] uppercase tracking-[0.1em] text-ink-4">
            {alt.deployment.note}
          </div>
          <CommandBlock command={alt.quickStart} />
        </div>
      )}

      <div className="mt-[16px] flex items-center justify-between gap-3 border-t border-border pt-[14px]">
        <div className="flex items-center gap-4 text-[13px]">
          <span className="text-ink-3">
            Migration <span className="text-ink">{alt.migration}</span>
          </span>
          {alt.savingsPct !== null && (
            <span className="tabular-nums text-ok">↓ {alt.savingsPct}% cheaper</span>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/app/models/${m.id}`} className={btn}>
            View
          </Link>
          <Link href={`/app/compare?ids=${baseId},${m.id}`} className={btn}>
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
