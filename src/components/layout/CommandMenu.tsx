"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Boxes, CornerDownLeft, LayoutGrid, Search, Server } from "lucide-react";
import { useModels, useProviders } from "@/lib/query/hooks";
import { CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import { CAPABILITY_KEYS } from "@/lib/domain/types";
import { formatPrice, formatTokens } from "@/lib/utils/format";
import { useCommandMenu } from "./command-menu-context";

const groupClass =
  "[&_[cmdk-group-heading]]:px-[10px] [&_[cmdk-group-heading]]:pb-[5px] [&_[cmdk-group-heading]]:pt-[9px] [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.13em] [&_[cmdk-group-heading]]:text-ink-4";

const itemClass =
  "flex h-[38px] cursor-pointer items-center gap-[11px] rounded-[6px] px-[10px] text-[15px] text-ink data-[selected=true]:bg-accent-dim";

function ItemIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[5px] border border-border text-ink-3">
      {children}
    </span>
  );
}

export function CommandMenu() {
  const { open, setOpen } = useCommandMenu();
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data: models = [] } = useModels({});
  const { data: providers = [] } = useProviders();

  const providerName = useMemo(
    () => new Map(providers.map((p) => [p.id, p.name])),
    [providers],
  );

  // We filter ourselves and render only the top hits. Handing cmdk all ~3k models made it
  // score every item on each keystroke, which froze the menu - so once a search narrows the
  // pool we can afford to show a lot more than the empty-state browse cap.
  const needle = q.trim().toLowerCase();
  const MODEL_BROWSE_CAP = 8;
  const MODEL_SEARCH_CAP = 30;

  const modelMatches = useMemo(
    () =>
      needle
        ? models.filter((m) =>
            `${m.name} ${providerName.get(m.providerId) ?? ""} ${m.family ?? ""} ${(m.tags ?? []).join(" ")}`
              .toLowerCase()
              .includes(needle),
          )
        : models,
    [models, needle, providerName],
  );
  const modelCap = needle ? MODEL_SEARCH_CAP : MODEL_BROWSE_CAP;
  const modelHits = useMemo(() => modelMatches.slice(0, modelCap), [modelMatches, modelCap]);
  const modelOverflow = Math.max(0, modelMatches.length - modelHits.length);

  const providerHits = useMemo(() => {
    const base = needle
      ? providers.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(needle))
      : providers;
    return base.slice(0, 5);
  }, [providers, needle]);

  const capabilityHits = useMemo(() => {
    const base = needle
      ? CAPABILITY_KEYS.filter((k) => CAPABILITY_LABELS[k].toLowerCase().includes(needle))
      : CAPABILITY_KEYS;
    return base.slice(0, 5);
  }, [needle]);

  const empty = !modelHits.length && !providerHits.length && !capabilityHits.length;

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Search Impulse">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <Command
        label="Search Impulse"
        shouldFilter={false}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="absolute left-1/2 top-[14vh] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-[10px] border border-border-strong bg-elevated shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)]"
      >
        <div className="flex items-center gap-[10px] border-b border-border px-[15px] py-[13px]">
          <Search size={16} className="flex-none text-ink-3" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Search models, providers, capabilities…"
            className="flex-1 bg-transparent text-[17px] tracking-[-0.01em] text-ink outline-none placeholder:text-ink-4"
          />
          <span className="rounded-[4px] border border-border px-[6px] py-px text-[12px] text-ink-4">
            ESC
          </span>
        </div>

        <Command.List className="max-h-[52vh] overflow-y-auto p-[6px]">
          {empty && (
            <div className="px-[10px] py-6 text-center text-[15px] text-ink-4">
              No results for “{q}”.
            </div>
          )}

          <Command.Group heading="Models" className={modelHits.length ? groupClass : "hidden"}>
            {modelHits.map((m) => (
              <Command.Item
                key={m.id}
                value={`${m.name} ${providerName.get(m.providerId) ?? ""} ${m.family ?? ""} ${(m.tags ?? []).join(" ")}`}
                onSelect={() => go(`/app/models/${m.id}`)}
                className={itemClass}
              >
                <ItemIcon>
                  <Boxes size={13} />
                </ItemIcon>
                <span>{m.name}</span>
                <span className="ml-auto whitespace-nowrap text-[13px] text-ink-3">
                  {providerName.get(m.providerId)} · {formatTokens(m.context.contextWindow)} ·{" "}
                  {formatPrice(m.pricing.inputPerMTok)}
                </span>
              </Command.Item>
            ))}
            {modelOverflow > 0 && (
              <div className="px-[10px] py-[6px] text-[13px] text-ink-4">
                +{modelOverflow} more - keep typing to narrow it down
              </div>
            )}
          </Command.Group>

          <Command.Group heading="Providers" className={providerHits.length ? groupClass : "hidden"}>
            {providerHits.map((p) => (
              <Command.Item
                key={p.id}
                value={`${p.name} provider`}
                onSelect={() => go(`/app/providers/${p.id}`)}
                className={itemClass}
              >
                <ItemIcon>
                  <Server size={13} />
                </ItemIcon>
                <span>{p.name}</span>
                <span className="ml-auto text-[13px] text-ink-3 capitalize">{p.category}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Capabilities" className={capabilityHits.length ? groupClass : "hidden"}>
            {capabilityHits.map((key) => (
              <Command.Item
                key={key}
                value={`${CAPABILITY_LABELS[key]} capability filter`}
                onSelect={() => go(`/app/models?caps=${key}`)}
                className={itemClass}
              >
                <ItemIcon>
                  <LayoutGrid size={13} />
                </ItemIcon>
                <span>{CAPABILITY_LABELS[key]}</span>
                <span className="ml-auto flex items-center gap-1 text-[13px] text-ink-4">
                  filter <CornerDownLeft size={11} />
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        <div className="flex gap-4 border-t border-border px-[14px] py-[9px] text-[13px] text-ink-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </Command>
    </div>
  );
}
