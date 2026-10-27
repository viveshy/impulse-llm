"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { ModelSortKey, TierFilter } from "@/lib/catalog/select";
import type { ModelKind } from "@/lib/catalog/types";
import { filterHref, type ModelsQuery } from "@/lib/model-filters";
import { clsx } from "@/lib/utils/clsx";

const TIERS: { id: TierFilter; label: string }[] = [
  { id: "frontier", label: "Frontier" },
  { id: "open", label: "Open weights" },
  { id: "other", label: "Other labs" },
  { id: "all", label: "All" },
];

const KINDS: { id: ModelKind | "all"; label: string }[] = [
  { id: "chat", label: "Chat & reasoning" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "speech", label: "Speech" },
  { id: "transcription", label: "Transcription" },
  { id: "realtime", label: "Realtime" },
  { id: "embedding", label: "Embedding" },
  { id: "rerank", label: "Rerank" },
  { id: "all", label: "All types" },
];

const SORTS: { id: ModelSortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "price", label: "Cheapest" },
  { id: "context", label: "Longest context" },
  { id: "hosts", label: "Most hosts" },
  { id: "name", label: "Name" },
];

const selectClass =
  "h-9 rounded-[8px] border border-border bg-panel px-2 text-[14px] text-ink-2 hover:border-border-strong focus-visible:outline-2";

export function FilterBar({
  query,
  tier,
  labs,
}: {
  query: ModelsQuery;
  /** The tier in effect (the default depends on whether a lab or search is set). */
  tier: TierFilter;
  labs: { slug: string; name: string; count: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(query.q ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (patch: Partial<ModelsQuery>) => start(() => router.replace(filterHref(query, patch), { scroll: false }));

  useEffect(() => () => clearTimeout(timer.current), []);

  const onSearch = (value: string) => {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: value.trim() || undefined }), 250);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-0 flex-1 basis-[260px] items-center">
          <span className="sr-only">Search models</span>
          <Search size={16} className="pointer-events-none absolute left-3 text-ink-3" />
          <input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name or API id"
            className="h-10 w-full rounded-[10px] border border-border bg-panel pl-9 pr-9 text-[15px] text-ink outline-none placeholder:text-ink-4 hover:border-border-strong focus:border-accent-line"
          />
          {pending ? (
            <Loader2 size={15} className="absolute right-3 animate-spin text-ink-3" />
          ) : (
            q && (
              <button
                type="button"
                onClick={() => onSearch("")}
                aria-label="Clear search"
                className="absolute right-2 grid h-6 w-6 place-items-center rounded-[6px] text-ink-3 hover:bg-hover hover:text-ink"
              >
                <X size={14} />
              </button>
            )
          )}
        </label>
        <select
          aria-label="Lab"
          value={query.lab ?? ""}
          onChange={(e) => go({ lab: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">All labs</option>
          {labs.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name} ({l.count})
            </option>
          ))}
        </select>
        <select
          aria-label="Type"
          value={query.kind ?? "chat"}
          onChange={(e) => go({ kind: e.target.value as ModelKind | "all" })}
          className={selectClass}
        >
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort"
          value={query.sort ?? "newest"}
          onChange={(e) => go({ sort: e.target.value as ModelSortKey })}
          className={selectClass}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Tier" className="flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tier === t.id}
              onClick={() => go({ tier: t.id })}
              className={clsx(
                "h-8 rounded-full border px-3 text-[13.5px] transition-colors",
                tier === t.id
                  ? "border-ink bg-ink text-bg"
                  : "border-border bg-panel text-ink-2 hover:border-border-strong hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[13.5px] text-ink-2">
          <input
            type="checkbox"
            checked={!!query.includeRetired}
            onChange={(e) => go({ includeRetired: e.target.checked || undefined })}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Include retired
        </label>
      </div>
    </div>
  );
}
