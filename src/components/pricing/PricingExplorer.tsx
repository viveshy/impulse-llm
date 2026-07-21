"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Model, Provider } from "@/lib/domain/types";
import { computeCost, formatUSD, hasPublishedPrice, isBillableForChat } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";
import { SectionLabel } from "@/components/common/Panel";
import { SearchField } from "@/components/common/SearchField";

const PRESETS = [
  { label: "Light", inputMTok: 1, outputMTok: 0.2 },
  { label: "Medium", inputMTok: 10, outputMTok: 2 },
  { label: "Heavy", inputMTok: 100, outputMTok: 20 },
];

const GRID = "grid grid-cols-[minmax(0,1fr)_120px_120px_140px] items-center gap-4 px-[15px]";

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-2">
      <span className="text-[12px] uppercase tracking-[0.1em] text-ink-4">{label}</span>
      <div className="flex h-[44px] items-center rounded-[8px] border border-border-strong bg-panel px-3 focus-within:border-accent-line">
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="w-full bg-transparent text-[18px] tabular-nums text-ink outline-none"
        />
        <span className="ml-2 text-[13px] text-ink-4">M tokens</span>
      </div>
    </label>
  );
}

export function PricingExplorer({
  models,
  providers,
}: {
  models: Model[];
  providers: Provider[];
}) {
  const [inputMTok, setInputMTok] = useState(10);
  const [outputMTok, setOutputMTok] = useState(2);
  const [search, setSearch] = useState("");

  const providerName = useMemo(() => new Map(providers.map((p) => [p.id, p.name])), [providers]);

  const ranked = useMemo(() => {
    const workload = { inputMTok, outputMTok };
    const needle = search.trim().toLowerCase();
    return models
      .filter(isBillableForChat)
      .filter((m) => m.deprecation !== "deprecated")
      .filter((m) =>
        needle
          ? `${m.name} ${providerName.get(m.providerId) ?? ""} ${m.family ?? ""}`
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .map((m) => ({ model: m, cost: computeCost(m, workload), priced: hasPublishedPrice(m) }))
      // real prices first (cheapest → dearest); unpublished rates sink to the bottom
      .sort((a, b) => {
        if (a.priced !== b.priced) return a.priced ? -1 : 1;
        return a.priced
          ? a.cost.total - b.cost.total
          : a.model.name.localeCompare(b.model.name);
      });
  }, [models, inputMTok, outputMTok, search, providerName]);

  const unpricedCount = useMemo(() => ranked.filter((r) => !r.priced).length, [ranked]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-[22px]">
      <p className="mb-6 max-w-[70ch] text-[15px] leading-[1.6] text-ink-2">
        Enter your monthly token volume to estimate and rank the cost of every model for your
        workload.
      </p>

      {/* calculator */}
      <div className="rounded-[10px] border border-border bg-panel p-[18px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <NumberField label="Input / month" value={inputMTok} onChange={setInputMTok} />
          <NumberField label="Output / month" value={outputMTok} onChange={setOutputMTok} />
          <div className="flex flex-col gap-2">
            <span className="text-[12px] uppercase tracking-[0.1em] text-ink-4">Presets</span>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setInputMTok(p.inputMTok);
                    setOutputMTok(p.outputMTok);
                  }}
                  className={clsx(
                    "h-[44px] rounded-[8px] border px-[14px] text-[14px] transition-colors",
                    inputMTok === p.inputMTok && outputMTok === p.outputMTok
                      ? "border-accent-line bg-accent-dim text-ink"
                      : "border-border text-ink-2 hover:border-border-strong hover:text-ink",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ranked list */}
      <div className="mt-7">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>
            Estimated monthly cost · {ranked.length - unpricedCount} priced
            {unpricedCount > 0 && ` · ${unpricedCount} unpublished`}
          </SectionLabel>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search models…"
            className="w-[clamp(180px,26vw,320px)]"
          />
        </div>
        <div className="overflow-hidden rounded-[10px] border border-border">
          <div className={`${GRID} h-9 border-b border-border text-[12px] uppercase tracking-[0.1em] text-ink-4`}>
            <span>Model</span>
            <span className="text-right">Input / 1M</span>
            <span className="text-right">Output / 1M</span>
            <span className="text-right">Monthly</span>
          </div>
          {ranked.map(({ model, cost, priced }, i) => (
            <Link
              key={model.id}
              href={`/app/models/${model.id}`}
              className={`${GRID} relative h-[46px] border-b border-border-2 transition-colors last:border-0 hover:bg-hover`}
            >
              {priced && i === 0 && (
                <span className="absolute bottom-2 left-0 top-2 w-[2px] rounded-[2px] bg-accent" />
              )}
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="truncate text-[15px] text-ink">{model.name}</span>
                <span className="truncate text-[13px] text-ink-4">
                  {providerName.get(model.providerId)}
                </span>
                {priced && i === 0 && (
                  <span className="flex-none rounded-[4px] border border-accent-line bg-accent-dim px-[6px] py-px text-[11px] text-accent">
                    Best value
                  </span>
                )}
                {!priced && (
                  <span className="flex-none rounded-[4px] border border-border px-[6px] py-px text-[11px] text-ink-4">
                    Price not published
                  </span>
                )}
              </span>
              <span className="text-right text-[14px] text-ink-3">
                {priced ? formatPrice(model.pricing.inputPerMTok) : "-"}
              </span>
              <span className="text-right text-[14px] text-ink-3">
                {priced ? formatPrice(model.pricing.outputPerMTok) : "-"}
              </span>
              <span className="text-right text-[15px] tabular-nums text-ink">
                {priced ? formatUSD(cost.total) : <span className="text-ink-4">-</span>}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
