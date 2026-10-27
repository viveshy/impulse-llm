"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { HOST_KIND_LABEL } from "@/lib/catalog/hosts";
import type { WatchOption } from "@/lib/catalog/watch";
import { watchlistHref } from "@/lib/routes";
import { loadSearchIndex, rankModels, type SearchIndex } from "@/lib/search";
import { clsx } from "@/lib/utils/clsx";
import { formatDate, formatReleaseDate } from "@/lib/utils/format";
import { MAX_WATCH, watchKey, type WatchItem } from "@/lib/watchlist";
import { HostMark } from "@/components/ui/BrandMark";
import { rememberList } from "./memory";

type Options = { model: { slug: string; name: string; lab: string }; hosts: WatchOption[] };

/** Search a model, pick the host it runs on and, if you like, one version or region; then add it to the list. */
export function AddToWatchlist({ items, preselect }: { items: WatchItem[]; preselect?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<string | null>(preselect ?? null);
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [host, setHost] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!open || data) return;
    let live = true;
    loadSearchIndex().then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [open, data]);

  useEffect(() => {
    if (!picked) return;
    let live = true;
    fetch(`/api/watch-options?m=${encodeURIComponent(picked)}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Options>;
      })
      .then(
        (o) => {
          if (!live) return;
          setOptions(o);
          setHost(o.hosts[0]?.host.slug ?? "");
        },
        () => live && setOptionsFailed(true),
      );
    return () => {
      live = false;
    };
  }, [picked]);

  const labName = useMemo(() => new Map((data?.labs ?? []).map((l) => [l.s, l.n])), [data]);
  const results = useMemo(() => (data ? rankModels(data.models, q, { limit: 12 }) : []), [data, q]);

  const full = items.length >= MAX_WATCH;
  const choice = options?.hosts.find((o) => o.host.slug === host);
  const item: WatchItem | null = picked && host ? { model: picked, host, ...(pin ? { pin } : {}) } : null;
  const already = !!item && items.some((i) => watchKey(i) === watchKey(item));

  const pick = (slug: string) => {
    setOpen(false);
    setQ("");
    setPicked(slug);
    setOptions(null);
    setOptionsFailed(false);
    setHost("");
    setPin("");
  };
  const close = () => {
    setPicked(null);
    setOptions(null);
    setOptionsFailed(false);
  };
  const add = () => {
    if (!item || already || full) return;
    close();
    const next = [...items, item];
    rememberList(next);
    router.push(watchlistHref(next), { scroll: false });
  };

  return (
    <div>
      <Command
        label="Find a model to watch"
        shouldFilter={false}
        className="relative w-full max-w-[420px]"
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          else if (e.key === "ArrowDown") setOpen(true);
        }}
      >
        <div className="flex h-10 items-center gap-2 rounded-[10px] border border-border-strong bg-panel px-3 focus-within:border-accent-line focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent-line">
          <Plus size={16} className="flex-none text-ink-3" />
          <Command.Input
            value={q}
            disabled={full}
            onValueChange={(v) => {
              setQ(v);
              setOpen(true);
            }}
            onClick={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            placeholder={full ? `Up to ${MAX_WATCH} models on one list` : "Add a model you run…"}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink !outline-none placeholder:text-ink-4 disabled:cursor-not-allowed"
          />
        </div>
        {open && !full && (
          <Command.List
            // Keep focus in the input while an option is clicked.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[340px] overflow-y-auto rounded-[12px] border border-border-strong bg-elevated p-[6px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
          >
            {!data && !failed && <div className="px-3 py-4 text-[14px] text-ink-3">Loading the catalog…</div>}
            {failed && <div className="px-3 py-4 text-[14px] text-ink-3">Search is unavailable right now.</div>}
            {data && !results.length && <div className="px-3 py-4 text-[14px] text-ink-3">No models match “{q}”.</div>}
            {results.map((r) => (
              <Command.Item
                key={`${r.l}/${r.s}`}
                value={`${r.l}/${r.s}`}
                onSelect={() => pick(r.s)}
                className="flex min-h-[38px] cursor-pointer items-center gap-3 rounded-[8px] px-[10px] text-[14.5px] text-ink data-[selected=true]:bg-hover"
              >
                <span className="min-w-0 truncate">{r.n}</span>
                <span className="ml-auto whitespace-nowrap text-[12.5px] text-ink-3">
                  {labName.get(r.l) ?? r.l}
                  {r.r ? ` · ${formatReleaseDate(r.r)}` : ""}
                </span>
              </Command.Item>
            ))}
          </Command.List>
        )}
      </Command>

      {picked && (
        <div className="mt-3 max-w-[760px] rounded-[12px] border border-border bg-panel p-4 shadow-[var(--shadow)]">
          {!options && !optionsFailed && <p className="text-[14px] text-ink-3">Finding where it runs…</p>}
          {optionsFailed && (
            <p className="text-[14px] text-ink-3">
              We couldn&rsquo;t find that model.{" "}
              <button type="button" onClick={close} className="text-accent hover:underline">
                Close
              </button>
            </p>
          )}
          {options && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <fieldset>
                <legend className="text-[15px] font-medium text-ink">Where do you run {options.model.name}?</legend>
                <div className="mt-3 grid max-h-[340px] gap-2 overflow-y-auto p-[2px] sm:grid-cols-2">
                  {options.hosts.map((o) => (
                    <label
                      key={o.host.slug}
                      className={clsx(
                        "flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-line",
                        host === o.host.slug ? "border-accent-line bg-accent-dim" : "border-border hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name="host"
                        value={o.host.slug}
                        checked={host === o.host.slug}
                        onChange={() => {
                          setHost(o.host.slug);
                          setPin("");
                        }}
                        className="sr-only"
                      />
                      <HostMark slug={o.host.slug} name={o.host.name} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] text-ink">{o.host.name}</span>
                        <span className="block text-[12.5px] text-ink-3">
                          {HOST_KIND_LABEL[o.host.kind]}
                          {o.listings.length > 1 ? ` · ${o.listings.length} listings` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {choice && choice.listings.length > 1 && (
                <label className="mt-4 block">
                  <span className="text-[14px] font-medium text-ink-2">Version or region</span>
                  <select
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="mt-1 block w-full rounded-[8px] border border-border-strong bg-panel px-3 py-2 text-[14px] text-ink"
                  >
                    <option value="">All {choice.listings.length} listings on {choice.host.name}</option>
                    {choice.listings.map((l) => (
                      <option key={l.pin} value={l.pin}>
                        {l.apiModelId}
                        {l.label ? ` (${l.label})` : ""}
                        {l.retires ? `, retires ${formatDate(l.retires)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!item || already || full}
                  className="inline-flex h-10 items-center rounded-[10px] bg-accent px-4 text-[14.5px] font-medium text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add to watchlist
                </button>
                <button type="button" onClick={close} className="text-[14px] text-ink-3 hover:text-ink">
                  Cancel
                </button>
                {already && <span className="text-[13.5px] text-ink-3">Already on your watchlist.</span>}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
