"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { PRESETS, type Workload } from "@/lib/catalog/cost";
import { foldVariants, MAX_CACHE, priceAll, visibleRows, workloadParams, type CalcRow, type PriceSource } from "@/lib/calculator";
import { modelHref } from "@/lib/routes";
import { formatCount, formatMoney, formatMultiple, formatTokens } from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";
import { Badge } from "@/components/ui/Badge";
import { StatTile } from "@/components/ui/StatTile";

export interface CalculatorState {
  workload: Workload;
  source: PriceSource;
  open: boolean;
  older: boolean;
}

const PAGE = 40;

const same = (a: Workload, b: Workload) =>
  a.requestsPerDay === b.requestsPerDay &&
  a.inputTokens === b.inputTokens &&
  a.outputTokens === b.outputTokens &&
  a.cacheHitRate === b.cacheHitRate &&
  a.batch === b.batch;

function NumberField({
  label,
  value,
  onValue,
  hint,
}: {
  label: string;
  value: number;
  onValue: (n: number) => void;
  hint?: string;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  // Follow outside changes (a preset) during render, but leave the field alone while it holds the same number.
  if (value !== seen) {
    setSeen(value);
    if (Number(text) !== value) setText(String(value));
  }
  return (
    <div>
      <label htmlFor={id} className="text-[13.5px] font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Math.round(Number(e.target.value));
          if (Number.isFinite(n) && n > 0) onValue(n);
        }}
        onBlur={() => setText(String(value))}
        className="mt-1 h-10 w-full rounded-[9px] border border-border-strong bg-panel px-3 text-[15px] text-ink outline-none focus:border-accent-line"
      />
      {hint && <p className="mt-1 text-[12.5px] text-ink-3">{hint}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-[13.5px] font-medium text-ink-2">{label}</div>
      <div role="radiogroup" aria-label={label} className="mt-1 grid grid-flow-col gap-1 rounded-[10px] bg-sunken p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={clsx(
              "h-8 rounded-[8px] px-2 text-[13.5px] transition-colors",
              value === o.id ? "bg-panel font-medium text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-[14px] text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] h-4 w-4 flex-none accent-[var(--accent)]"
      />
      <span>{children}</span>
    </label>
  );
}

export function Calculator({
  rows,
  initial,
  pinned,
  unpriced,
}: {
  rows: CalcRow[];
  initial: CalculatorState;
  /** Models the visitor came from, as slugs and their "lab/model" pairs. */
  pinned: { s: string; pair: string }[];
  unpriced: string[];
}) {
  const [w, setW] = useState(initial.workload);
  const [source, setSource] = useState(initial.source);
  const [open, setOpen] = useState(initial.open);
  const [older, setOlder] = useState(initial.older);
  const [all, setAll] = useState(false);
  const pinnedSlugs = useMemo(() => pinned.map((p) => p.s), [pinned]);

  // Keep the address shareable without navigating.
  useEffect(() => {
    const t = setTimeout(() => {
      const sp = new URLSearchParams(workloadParams(w));
      if (source !== "lab") sp.set("src", source);
      if (open) sp.set("open", "1");
      if (older) sp.set("older", "1");
      if (pinned.length) sp.set("m", pinned.map((p) => p.pair).join(","));
      window.history.replaceState(window.history.state, "", `?${sp.toString().replaceAll("%2F", "/").replaceAll("%2C", ",")}`);
    }, 300);
    return () => clearTimeout(t);
  }, [w, source, open, older, pinned]);

  const results = useMemo(
    () => foldVariants(priceAll(visibleRows(rows, { open, older, pinned: pinnedSlugs }), w, source), pinnedSlugs),
    [rows, w, source, open, older, pinnedSlugs],
  );
  const cheapest = results.find((r) => r.fits);
  const picks = results.filter((r) => pinnedSlugs.includes(r.row.s));
  const shown = all ? results : results.slice(0, PAGE);
  const monthly = w.requestsPerDay * 30;
  const set = (patch: Partial<Workload>) => setW((x) => ({ ...x, ...patch }));

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-5 rounded-[14px] border border-border bg-panel p-5 shadow-[var(--shadow)] lg:sticky lg:top-[84px]"
      >
        <div>
          <div className="text-[13.5px] font-medium text-ink-2">Start from</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={same(w, p.workload)}
                onClick={() => setW(p.workload)}
                className={clsx(
                  "h-8 rounded-full border px-3 text-[13.5px] transition-colors",
                  same(w, p.workload)
                    ? "border-ink bg-ink text-bg"
                    : "border-border bg-panel text-ink-2 hover:border-border-strong hover:text-ink",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <NumberField label="Requests a day" value={w.requestsPerDay} onValue={(n) => set({ requestsPerDay: n })} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Input tokens" value={w.inputTokens} onValue={(n) => set({ inputTokens: n })} />
          <NumberField label="Output tokens" value={w.outputTokens} onValue={(n) => set({ outputTokens: n })} />
        </div>
        <p className="-mt-3 text-[12.5px] text-ink-3">Per request. A page of text is about 500 tokens.</p>
        <div>
          <label htmlFor="cache" className="flex items-baseline justify-between text-[13.5px] font-medium text-ink-2">
            Prompt cache hits <span className="tabular-nums text-ink">{Math.round(w.cacheHitRate * 100)}%</span>
          </label>
          <input
            id="cache"
            type="range"
            min={0}
            max={MAX_CACHE * 100}
            step={5}
            value={Math.round(w.cacheHitRate * 100)}
            aria-valuetext={`${Math.round(w.cacheHitRate * 100)} percent`}
            onChange={(e) => set({ cacheHitRate: Number(e.target.value) / 100 })}
            className="mt-2 w-full accent-[var(--accent)]"
          />
          <p className="mt-1 text-[12.5px] text-ink-3">
            Share of input read from the cache: a repeated system prompt, documents, chat history.
          </p>
        </div>
        <Toggle checked={w.batch} onChange={(v) => set({ batch: v })}>
          Batch API: results within 24 hours, at the batch price where there is one
        </Toggle>
        <Segmented
          label="Price at"
          value={source}
          onChange={setSource}
          options={[
            { id: "lab", label: "Lab's own API" },
            { id: "cheapest", label: "Cheapest host" },
          ]}
        />
        <div className="space-y-2">
          <Toggle checked={open} onChange={setOpen}>
            Include open-weight models
          </Toggle>
          <Toggle checked={older} onChange={setOlder}>
            Include older versions
          </Toggle>
        </div>
      </form>

      <div className="min-w-0 space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Cheapest that fits"
            value={cheapest ? formatMoney(cheapest.est.total) : "-"}
            sub={cheapest ? `${cheapest.row.n}, at ${cheapest.host}` : "No model fits this request"}
          />
          {picks[0] && cheapest ? (
            <StatTile
              label={picks[0].row.n}
              value={formatMoney(picks[0].est.total)}
              sub={
                picks[0] === cheapest
                  ? "The cheapest option here"
                  : `${formatMultiple(picks[0].est.total / cheapest.est.total)} the cheapest, at ${picks[0].host}`
              }
            />
          ) : (
            <StatTile label="Models priced" value={results.length} sub={open ? "Frontier and open-weight" : "Frontier labs"} />
          )}
          <StatTile
            label="Monthly volume"
            value={`${formatCount(monthly)} requests`}
            sub={`${formatTokens(monthly * w.inputTokens)} input and ${formatTokens(monthly * w.outputTokens)} output tokens`}
          />
        </div>
        {unpriced.length > 0 && (
          <p className="rounded-[10px] border border-border bg-sunken px-3 py-2 text-[13.5px] text-ink-2">
            {unpriced.join(", ")} {unpriced.length === 1 ? "has" : "have"} no listed per-token price, so{" "}
            {unpriced.length === 1 ? "it is" : "they are"} not in the ranking.
          </p>
        )}

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="num hidden w-[44px] sm:table-cell">#</th>
                <th>Model</th>
                <th className="num">Per month</th>
                <th className="num hidden sm:table-cell">Per 1,000 requests</th>
                <th className="num">vs cheapest</th>
                <th className="hidden md:table-cell">Prices used</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => {
                const pin = pinnedSlugs.includes(r.row.s);
                return (
                  <tr key={r.row.s} className={pin ? "[&>td]:bg-accent-dim" : undefined}>
                    <td className="num hidden text-ink-3 sm:table-cell">{i + 1}</td>
                    <td className="wrap sm:min-w-[220px]">
                      <Link
                        href={modelHref({ labSlug: r.row.l, slug: r.row.s })}
                        className="font-medium text-ink hover:text-accent hover:underline"
                      >
                        {r.row.n}
                      </Link>
                      {pin && (
                        <Badge tone="accent" className="ml-2">
                          Your pick
                        </Badge>
                      )}
                      <div className="text-[12.5px] text-ink-3">
                        {r.row.ln} · at {r.host}
                      </div>
                      {r.variants.length > 0 && (
                        <div className="text-[12.5px] text-ink-3" title={r.variants.join(", ")}>
                          <span className="sm:hidden">
                            +{r.variants.length} {r.variants.length === 1 ? "variant" : "variants"} at this price
                          </span>
                          <span className="hidden sm:inline">
                            Same price: {r.variants.slice(0, 3).join(", ")}
                            {r.variants.length > 3 ? ` and ${r.variants.length - 3} more` : ""}
                          </span>
                        </div>
                      )}
                      {!r.fits && (
                        <div className="text-[12.5px] text-err md:hidden">Request exceeds its context window</div>
                      )}
                    </td>
                    <td className="num font-medium text-ink">{formatMoney(r.est.total)}</td>
                    <td className="num hidden text-ink-2 sm:table-cell">{formatMoney(r.est.perRequest * 1000)}</td>
                    <td className="num text-ink-2">
                      {r === cheapest ? "cheapest" : cheapest && r.fits ? formatMultiple(r.est.total / cheapest.est.total) : ""}
                    </td>
                    <td className="wrap hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {!r.fits && <Badge tone="err">Request exceeds its {formatTokens(r.row.ctx)} context</Badge>}
                        {r.est.longContext && <Badge tone="warn">Long-prompt rate</Badge>}
                        {r.est.usedCache && <Badge>Cache price</Badge>}
                        {r.est.usedBatch && <Badge>Batch price</Badge>}
                        {r.fits && !r.est.longContext && !r.est.usedCache && !r.est.usedBatch && (
                          <span className="text-[13px] text-ink-3">List price</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {results.length > PAGE && (
          <button
            type="button"
            onClick={() => setAll((v) => !v)}
            className="h-10 rounded-[10px] border border-border-strong bg-panel px-4 text-[14px] font-medium text-ink hover:bg-hover"
          >
            {all ? "Show fewer" : `Show all ${results.length} models`}
          </button>
        )}
        <p className="text-[13px] text-ink-3">
          30-day month at list prices, before taxes, free tiers and volume discounts. Cache hits are billed at the cached
          input price; cache writes and reasoning tokens are not counted, so treat reasoning models as a floor.
        </p>
      </div>
    </div>
  );
}
