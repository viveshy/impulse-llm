import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PRESETS, monthlyCost } from "@/lib/catalog/cost";
import { priceTiers } from "@/lib/catalog/detail";
import type { CanonicalModel } from "@/lib/catalog/types";
import { formatMoney, formatUsd } from "@/lib/utils/format";

export function PricingCard({ model, calculatorHref }: { model: CanonicalModel; calculatorHref: string }) {
  const ref = model.reference;
  const tiers = priceTiers(ref.pricing);
  const costs = PRESETS.map((p) => ({ preset: p, cost: monthlyCost(ref.pricing, p.workload) }));
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Tier</th>
              <th className="num">Input / 1M</th>
              <th className="num">Output / 1M</th>
              <th className="hidden sm:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id}>
                <td className="wrap font-medium text-ink sm:whitespace-nowrap">
                  {t.label}
                  {t.note && <div className="text-[12.5px] font-normal text-ink-3 sm:hidden">{t.note}</div>}
                </td>
                <td className="num">{t.input !== undefined ? formatUsd(t.input) : ""}</td>
                <td className="num">{t.output !== undefined && t.output !== null ? formatUsd(t.output) : ""}</td>
                <td className="hidden text-[13px] text-ink-3 sm:table-cell">{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-[12px] border border-border bg-panel p-4 shadow-[var(--shadow)]">
        <h3 className="font-semibold tracking-[-0.01em]">What it costs a month</h3>
        <p className="mt-1 text-[13px] text-ink-3">At {ref.host.name} list prices, 30 days.</p>
        <ul className="mt-3 divide-y divide-border-2">
          {costs.map(({ preset, cost }) => (
            <li key={preset.id} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="text-[14px] text-ink">{preset.label}</span>
                <span className="block text-[12.5px] text-ink-3">
                  {preset.workload.requestsPerDay.toLocaleString("en-US")} requests a day,{" "}
                  {(preset.workload.inputTokens / 1000).toLocaleString("en-US")}K in /{" "}
                  {(preset.workload.outputTokens / 1000).toLocaleString("en-US")}K out
                  {cost?.usedCache ? ", cached" : ""}
                  {cost?.usedBatch ? ", batch" : ""}
                </span>
              </span>
              <span className="whitespace-nowrap text-[15px] font-semibold">{cost ? formatMoney(cost.total) : "-"}</span>
            </li>
          ))}
        </ul>
        <Link href={calculatorHref} className="mt-3 inline-flex items-center gap-1 text-[14px] font-medium text-accent hover:underline">
          Use your own numbers <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
