"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { MAX_COMPARE } from "@/lib/compare";
import { loadSearchIndex, rankModels, type SearchIndex } from "@/lib/search";
import { formatReleaseDate } from "@/lib/utils/format";

/** Search box that adds a model to the comparison. `current` holds "lab/model" pairs. */
export function AddModel({ current, autoFocus }: { current: string[]; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);

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

  const labName = useMemo(() => new Map((data?.labs ?? []).map((l) => [l.s, l.n])), [data]);
  const results = useMemo(() => {
    if (!data) return [];
    const taken = new Set(current.map((c) => c.split("/").pop()));
    return rankModels(data.models, q, { limit: 14 }).filter((r) => !taken.has(r.s));
  }, [data, q, current]);

  const full = current.length >= MAX_COMPARE;
  const add = (pair: string) => {
    setOpen(false);
    setQ("");
    router.push(`/compare?m=${[...current, pair].join(",")}`);
  };

  return (
    <Command
      label="Add a model to compare"
      shouldFilter={false}
      className="relative w-full max-w-[380px]"
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
          autoFocus={autoFocus}
          onValueChange={(v) => {
            setQ(v);
            setOpen(true);
          }}
          onClick={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={full ? `Up to ${MAX_COMPARE} models at a time` : "Add a model…"}
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
              onSelect={() => add(`${r.l}/${r.s}`)}
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
  );
}
