"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import type { Model, Provider } from "@/lib/domain/types";
import { CAPABILITY_GROUPS, CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import {
  formatLatency,
  formatPrice,
  formatThroughput,
  formatTokens,
} from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";
import { Popover } from "@/components/common/Popover";
import { ProviderGlyph } from "@/components/common/ProviderGlyph";

const MAX = 4;

type Getter = (m: Model) => number | null | undefined;
type Renderer = (m: Model) => React.ReactNode;

interface AttrRow {
  label: string;
  value: Getter;
  render: Renderer;
  better?: "low" | "high";
}

const SECTIONS: { title: string; rows: AttrRow[] }[] = [
  {
    title: "Pricing",
    rows: [
      { label: "Input / 1M", value: (m) => m.pricing.inputPerMTok, render: (m) => formatPrice(m.pricing.inputPerMTok), better: "low" },
      { label: "Output / 1M", value: (m) => m.pricing.outputPerMTok, render: (m) => formatPrice(m.pricing.outputPerMTok), better: "low" },
      { label: "Cached / 1M", value: (m) => m.pricing.cachedInputPerMTok, render: (m) => formatPrice(m.pricing.cachedInputPerMTok), better: "low" },
    ],
  },
  {
    title: "Context & limits",
    rows: [
      { label: "Context window", value: (m) => m.context.contextWindow, render: (m) => formatTokens(m.context.contextWindow), better: "high" },
      { label: "Max output", value: (m) => m.context.maxOutputTokens, render: (m) => formatTokens(m.context.maxOutputTokens), better: "high" },
    ],
  },
  {
    title: "Performance",
    rows: [
      { label: "Latency (TTFT)", value: (m) => m.performance.ttftMs, render: (m) => formatLatency(m.performance.ttftMs), better: "low" },
      { label: "Throughput", value: (m) => m.performance.tokensPerSec, render: (m) => formatThroughput(m.performance.tokensPerSec), better: "high" },
    ],
  },
];

function bestValue(models: Model[], get: Getter, better?: "low" | "high"): number | null {
  if (!better) return null;
  const nums = models.map(get).filter((v): v is number => typeof v === "number");
  if (nums.length < 2) return null;
  if (nums.every((v) => v === nums[0])) return null; // all equal → no winner
  return better === "low" ? Math.min(...nums) : Math.max(...nums);
}

function AddModelPicker({
  models,
  excludeIds,
  onAdd,
}: {
  models: Model[];
  excludeIds: string[];
  onAdd: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const options = models
    .filter((m) => !excludeIds.includes(m.id))
    .filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 40);

  return (
    <Popover
      width={280}
      trigger={() => (
        <span className="inline-flex h-[30px] items-center gap-[7px] rounded-[6px] border border-border-strong px-[12px] text-[14px] text-ink-2 transition-colors hover:text-ink">
          <Plus size={14} />
          Add model
        </span>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search models…"
            className="mb-1 h-[34px] rounded-[6px] border border-border bg-panel px-[10px] text-[14px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line"
          />
          <div className="max-h-[280px] overflow-y-auto">
            {options.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onAdd(m.id);
                  close();
                }}
                className="flex w-full items-center justify-between gap-2 rounded-[6px] px-[9px] py-[7px] text-left text-[14px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
              >
                <span className="truncate">{m.name}</span>
                <span className="flex-none text-[12px] text-ink-4">{formatPrice(m.pricing.inputPerMTok)}</span>
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-[9px] py-3 text-[13px] text-ink-4">No models.</div>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}

export function CompareView({
  allModels,
  providers,
}: {
  allModels: Model[];
  providers: Provider[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const modelById = useMemo(() => new Map(allModels.map((m) => [m.id, m])), [allModels]);
  const providerName = useMemo(() => new Map(providers.map((p) => [p.id, p.name])), [providers]);
  const monogram = useMemo(() => new Map(providers.map((p) => [p.id, p.monogram])), [providers]);

  const ids = useMemo(() => {
    const raw = searchParams.get("ids");
    return raw ? raw.split(",").filter((id) => modelById.has(id)).slice(0, MAX) : [];
  }, [searchParams, modelById]);

  const selected = ids.map((id) => modelById.get(id)!).filter(Boolean);

  const setIds = (next: string[]) => {
    const qs = next.length ? `?ids=${next.join(",")}` : "";
    router.replace(`/app/compare${qs}`, { scroll: false });
  };

  const cols = { gridTemplateColumns: `180px repeat(${selected.length}, minmax(210px, 1fr))` };

  if (selected.length === 0) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="max-w-[36ch] text-[15px] text-ink-3">
            Add two or more models to compare their pricing, context, performance and capabilities
            side by side.
          </p>
          <AddModelPicker models={allModels} excludeIds={[]} onAdd={(id) => setIds([id])} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-max px-6 pb-12 pt-[22px]">
        {/* header row: model columns */}
        <div className="grid items-end border-b border-border pb-3" style={cols}>
          <div className="flex items-end">
            {selected.length < MAX && (
              <AddModelPicker
                models={allModels}
                excludeIds={ids}
                onAdd={(id) => setIds([...ids, id])}
              />
            )}
          </div>
          {selected.map((m) => (
            <div key={m.id} className="px-[15px]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-[9px]">
                  <ProviderGlyph monogram={monogram.get(m.providerId) ?? "?"} size="sm" />
                  <span className="text-[12px] text-ink-4">{providerName.get(m.providerId)}</span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => setIds(ids.filter((x) => x !== m.id))}
                  className="grid h-[20px] w-[20px] place-items-center rounded-[4px] text-ink-4 hover:bg-white/[0.06] hover:text-ink"
                >
                  <X size={13} />
                </button>
              </div>
              <Link
                href={`/app/models/${m.id}`}
                className="mt-2 block text-[16px] font-medium tracking-[-0.02em] text-ink hover:text-accent"
              >
                {m.name}
              </Link>
            </div>
          ))}
        </div>

        {/* attribute sections */}
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-[15px] pb-2 pt-5 text-[12px] uppercase tracking-[0.1em] text-ink-4">
              {section.title}
            </div>
            {section.rows.map((row) => {
              const best = bestValue(selected, row.value, row.better);
              return (
                <div key={row.label} className="grid items-center border-b border-border-2" style={cols}>
                  <div className="px-[15px] py-[11px] text-[13px] text-ink-3">{row.label}</div>
                  {selected.map((m) => {
                    const v = row.value(m);
                    const isBest = best !== null && typeof v === "number" && v === best;
                    return (
                      <div
                        key={m.id}
                        className={clsx(
                          "px-[15px] py-[11px] text-[14px] tabular-nums",
                          isBest ? "font-medium text-accent" : "text-ink",
                        )}
                      >
                        {row.render(m)}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}

        {/* capabilities matrix */}
        <div className="px-[15px] pb-2 pt-5 text-[12px] uppercase tracking-[0.1em] text-ink-4">
          Capabilities
        </div>
        {CAPABILITY_GROUPS.flatMap((g) => g.keys).map((key) => (
          <div key={key} className="grid items-center border-b border-border-2" style={cols}>
            <div className="px-[15px] py-[10px] text-[13px] text-ink-3">{CAPABILITY_LABELS[key]}</div>
            {selected.map((m) => (
              <div key={m.id} className="px-[15px] py-[10px]">
                {m.capabilities[key] ? (
                  <Check size={16} className="text-ink-2" strokeWidth={2.2} />
                ) : (
                  <Minus size={16} className="text-ink-4" strokeWidth={2.2} />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
