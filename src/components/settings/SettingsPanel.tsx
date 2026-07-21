"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useModelsView } from "@/lib/prefs";
import { clsx } from "@/lib/utils/clsx";
import { SectionLabel } from "@/components/common/Panel";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-2 py-[14px] last:border-0">
      <div>
        <div className="text-[14px] text-ink">{label}</div>
        {hint && <div className="mt-[2px] text-[13px] text-ink-4">{hint}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-[7px] border border-border">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={clsx(
            "flex items-center gap-[6px] px-[12px] py-[6px] text-[13px] transition-colors",
            i > 0 && "border-l border-border",
            o.disabled
              ? "cursor-not-allowed text-ink-4"
              : value === o.value
                ? "bg-hover text-ink"
                : "text-ink-2 hover:text-ink",
          )}
        >
          {o.label}
          {o.disabled && <span className="text-[11px] text-ink-4">soon</span>}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel() {
  const [view, changeView] = useModelsView();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-[22px]">
      <div className="flex max-w-[640px] flex-col gap-8">
        <section>
          <SectionLabel>Appearance</SectionLabel>
          <div className="rounded-[10px] border border-border px-[16px]">
            <Row label="Theme" hint="Impulse is dark-first. A light theme is in progress.">
              <div className="flex overflow-hidden rounded-[7px] border border-border">
                <span className="flex items-center gap-[6px] bg-hover px-[12px] py-[6px] text-[13px] text-ink">
                  <Moon size={13} /> Dark <Check size={12} className="text-accent" />
                </span>
                <span className="flex cursor-not-allowed items-center gap-[6px] border-l border-border px-[12px] py-[6px] text-[13px] text-ink-4">
                  <Sun size={13} /> Light <span className="text-[11px]">soon</span>
                </span>
              </div>
            </Row>
          </div>
        </section>

        <section>
          <SectionLabel>Preferences</SectionLabel>
          <div className="rounded-[10px] border border-border px-[16px]">
            <Row label="Default models view" hint="Which layout the models explorer opens in.">
              <Segmented
                value={view}
                onChange={changeView}
                options={[
                  { value: "list", label: "List" },
                  { value: "grid", label: "Grid" },
                ]}
              />
            </Row>
            <Row label="Currency" hint="Prices are shown per 1M tokens.">
              <Segmented
                value="usd"
                onChange={() => {}}
                options={[
                  { value: "usd", label: "USD" },
                  { value: "eur", label: "EUR", disabled: true },
                ]}
              />
            </Row>
          </div>
        </section>

        <section>
          <SectionLabel>About</SectionLabel>
          <div className="rounded-[10px] border border-border px-[16px]">
            <Row label="Impulse" hint="The single reference for every AI model.">
              <span className="rounded-[5px] border border-border px-[7px] py-[2px] text-[12px] text-ink-3">
                v1
              </span>
            </Row>
            <Row label="Data" hint="Live catalog synced from open sources (LiteLLM, OpenRouter, Hugging Face).">
              <span className="text-[13px] text-ink-4">Live</span>
            </Row>
          </div>
        </section>
      </div>
    </div>
  );
}
