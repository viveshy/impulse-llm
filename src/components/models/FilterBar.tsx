"use client";

import { ArrowDownUp, Check, LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import type { CapabilityKey, Facets, ModelQuery, ModelSort } from "@/lib/domain/types";
import { SORT_LABELS } from "@/lib/models-query-url";
import { clsx } from "@/lib/utils/clsx";
import { Popover } from "@/components/common/Popover";

type View = "list" | "grid";

function toggle<T>(arr: T[] | undefined, value: T): T[] {
  const set = new Set(arr ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set];
}

function CheckRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-[10px] rounded-[6px] px-[9px] py-[6px] text-left text-[15px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
    >
      <span
        className={clsx(
          "grid h-[15px] w-[15px] flex-none place-items-center rounded-[4px] border",
          active ? "border-accent bg-accent-dim text-accent" : "border-border-strong text-transparent",
        )}
      >
        <Check size={11} strokeWidth={3} />
      </span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[13px] text-ink-4">{count}</span>}
    </button>
  );
}

function Chip({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <span className="flex h-[27px] items-center gap-[7px] rounded-[6px] border border-border-strong bg-hover pl-[10px] pr-[6px] text-[15px] text-ink">
      <span className="font-medium">{label}</span>
      <span className="text-ink-2">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="grid h-4 w-4 place-items-center rounded-[3px] text-ink-3 hover:bg-white/[0.06] hover:text-ink"
      >
        <X size={12} />
      </button>
    </span>
  );
}

const triggerBtn =
  "inline-flex h-[27px] items-center gap-[6px] rounded-[6px] border border-border px-[9px] text-[15px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink";

export function FilterBar({
  facets,
  query,
  onChange,
  view,
  onViewChange,
  count,
}: {
  facets: Facets | undefined;
  query: ModelQuery;
  onChange: (q: ModelQuery) => void;
  view: View;
  onViewChange: (v: View) => void;
  count: number;
}) {
  const providerName = (id: string) => facets?.providers.find((p) => p.id === id)?.name ?? id;
  const sort: ModelSort = query.sort ?? "popularity";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-[18px] py-[8px]">
      <Popover
        width={248}
        trigger={() => (
          <span className={triggerBtn}>
            <SlidersHorizontal size={13} className="text-ink-3" />
            Filter
          </span>
        )}
      >
        {() => (
          <div className="flex flex-col gap-1">
            <div className="px-[9px] pb-[4px] pt-[6px] text-[12px] uppercase tracking-[0.13em] text-ink-4">
              Provider
            </div>
            {facets?.providers.map((p) => (
              <CheckRow
                key={p.id}
                label={p.name}
                count={p.count}
                active={query.providerIds?.includes(p.id) ?? false}
                onClick={() => onChange({ ...query, providerIds: toggle(query.providerIds, p.id) })}
              />
            ))}
            <div className="px-[9px] pb-[4px] pt-[10px] text-[12px] uppercase tracking-[0.13em] text-ink-4">
              Capability
            </div>
            {facets?.capabilities.map((c) => (
              <CheckRow
                key={c.key}
                label={CAPABILITY_LABELS[c.key]}
                count={c.count}
                active={query.capabilities?.includes(c.key) ?? false}
                onClick={() => onChange({ ...query, capabilities: toggle(query.capabilities, c.key) })}
              />
            ))}
            <div className="mt-1 border-t border-border pt-1">
              <CheckRow
                label="Open weights only"
                active={query.openOnly ?? false}
                onClick={() => onChange({ ...query, openOnly: !query.openOnly })}
              />
            </div>
          </div>
        )}
      </Popover>

      {/* active filter chips */}
      {query.providerIds?.map((id) => (
        <Chip
          key={id}
          label="Provider"
          value={providerName(id)}
          onRemove={() => onChange({ ...query, providerIds: toggle(query.providerIds, id) })}
        />
      ))}
      {query.capabilities?.map((c: CapabilityKey) => (
        <Chip
          key={c}
          label="Capability"
          value={CAPABILITY_LABELS[c]}
          onRemove={() => onChange({ ...query, capabilities: toggle(query.capabilities, c) })}
        />
      ))}
      {query.openOnly && (
        <Chip label="Open weights" value="only" onRemove={() => onChange({ ...query, openOnly: false })} />
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-[15px] text-ink-4">{count} models</span>

        <Popover
          width={190}
          align="right"
          trigger={() => (
            <span className={triggerBtn}>
              <ArrowDownUp size={13} className="text-ink-3" />
              {SORT_LABELS[sort]}
            </span>
          )}
        >
          {(close) => (
            <div className="flex flex-col">
              {(Object.keys(SORT_LABELS) as ModelSort[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onChange({ ...query, sort: s });
                    close();
                  }}
                  className={clsx(
                    "flex items-center gap-2 rounded-[6px] px-[9px] py-[6px] text-left text-[15px] transition-colors hover:bg-hover",
                    s === sort ? "text-ink" : "text-ink-2",
                  )}
                >
                  <Check size={12} className={clsx(s === sort ? "text-accent" : "text-transparent")} />
                  {SORT_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <div className="flex overflow-hidden rounded-[6px] border border-border">
          <button
            type="button"
            aria-label="List view"
            onClick={() => onViewChange("list")}
            className={clsx(
              "grid h-[27px] w-[28px] place-items-center",
              view === "list" ? "bg-hover text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            <List size={14} />
          </button>
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => onViewChange("grid")}
            className={clsx(
              "grid h-[27px] w-[28px] place-items-center border-l border-border",
              view === "grid" ? "bg-hover text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
