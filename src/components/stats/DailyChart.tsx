"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { DailyTraffic } from "@/lib/domain/types";
import { formatCompact, formatCount, formatDate } from "@/lib/utils/format";
import { niceTicks } from "@/lib/utils/ticks";
import { clsx } from "@/lib/utils/clsx";

type Metric = "visitors" | "views";

const LABEL: Record<Metric, string> = { visitors: "Visitors", views: "Page views" };
const PLOT_H = 200;

/** "26 Oct" */
const dayMonth = (iso: string) => formatDate(iso).replace(/ \d{4}$/, "");

/** Daily visitors or page views as columns, one per day, with a tooltip per column and a table twin. */
export function DailyChart({ daily }: { daily: DailyTraffic[] }) {
  const [metric, setMetric] = useState<Metric>("visitors");
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const n = daily.length;
  const values = daily.map((d) => d[metric]);
  const ticks = niceTicks(Math.max(0, ...values));
  const top = ticks[ticks.length - 1];
  const empty = values.every((v) => v === 0);
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const shown = active === null ? null : daily[active];

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  return (
    <div className="rounded-[14px] border border-border bg-panel p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-[17px] font-semibold tracking-[-0.02em]">
            {LABEL[metric]} per day
          </h2>
          <p className="text-[13px] text-ink-3">Last {n} days, by UTC day</p>
        </div>
        <div role="radiogroup" aria-label="Measure" className="grid grid-flow-col gap-1 rounded-[10px] bg-sunken p-1">
          {(Object.keys(LABEL) as Metric[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={metric === m}
              onClick={() => setMetric(m)}
              className={clsx(
                "h-8 rounded-[8px] px-3 text-[13.5px]",
                metric === m ? "bg-panel font-medium text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink",
              )}
            >
              {LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-help`}
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        className="relative mt-5 flex rounded-[6px] outline-offset-4"
        style={{ height: PLOT_H + 26 }}
      >
        <span id={`${id}-help`} className="sr-only">
          Use the left and right arrow keys to read each day.
        </span>
        <div aria-hidden className="relative w-10 flex-none" style={{ height: PLOT_H }}>
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-2 translate-y-1/2 text-[12px] tabular-nums text-ink-3"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {formatCompact(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="absolute inset-x-0 top-0" style={{ height: PLOT_H }}>
            {ticks.map((t) => (
              <div
                key={t}
                className={clsx("absolute inset-x-0 border-t", t === 0 ? "border-border-strong" : "border-border-2")}
                style={{ bottom: `${(t / top) * 100}%` }}
              />
            ))}
            {empty && (
              <div className="absolute inset-0 grid place-items-center text-[14px] text-ink-3">No visits recorded yet</div>
            )}
          </div>

          <div className="absolute inset-x-0 top-0 flex items-end gap-[2px]" style={{ height: PLOT_H }}>
            {daily.map((d, i) => {
              const v = d[metric];
              return (
                <div
                  key={d.day}
                  aria-hidden
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                  className="flex h-full min-w-0 flex-1 items-end justify-center"
                >
                  <div
                    className={clsx(
                      "w-full max-w-[24px] rounded-t-[4px] transition-colors",
                      active === i ? "bg-chart-hi" : "bg-chart",
                    )}
                    style={{ height: `${(v / top) * 100}%`, minHeight: v > 0 ? 2 : 0 }}
                  />
                </div>
              );
            })}
          </div>

          <div aria-hidden className="absolute inset-x-0 flex gap-[2px]" style={{ top: PLOT_H + 6 }}>
            {daily.map((d, i) => (
              <div key={d.day} className="min-w-0 flex-1 whitespace-nowrap text-center text-[12px] text-ink-3">
                {(n - 1 - i) % labelEvery === 0 ? <span className="relative">{dayMonth(d.day)}</span> : null}
              </div>
            ))}
          </div>

          {shown && active !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-10 whitespace-nowrap rounded-[10px] border border-border-strong bg-elevated px-3 py-2 shadow-[var(--shadow)]"
              style={{
                left: `${((active + 0.5) / n) * 100}%`,
                bottom: `${26 + (shown[metric] / top) * PLOT_H + 8}px`,
                transform: `translateX(${active < n / 4 ? "-12%" : active > (3 * n) / 4 ? "-88%" : "-50%"})`,
              }}
            >
              <div className="text-[12.5px] text-ink-3">{formatDate(shown.day)}</div>
              {(["visitors", "views"] as Metric[]).map((m) => (
                <div key={m} className="flex items-center gap-2 text-[13.5px]">
                  <span className={clsx("h-[2px] w-3 rounded-full", m === metric ? "bg-chart" : "bg-transparent")} />
                  <span className="font-semibold tabular-nums text-ink">{formatCount(shown[m])}</span>
                  <span className="text-ink-3">{LABEL[m].toLowerCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {shown
            ? `${formatDate(shown.day)}: ${formatCount(shown.visitors)} visitors, ${formatCount(shown.views)} page views`
            : ""}
        </p>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-[13.5px] font-medium text-accent">Show as a table</summary>
        <div className="tbl-wrap mt-3 max-h-[360px] overflow-y-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Day</th>
                <th className="num">Visitors</th>
                <th className="num">Page views</th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.day}>
                  <td>{formatDate(d.day)}</td>
                  <td className="num">{formatCount(d.visitors)}</td>
                  <td className="num">{formatCount(d.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
