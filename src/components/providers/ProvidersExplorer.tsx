"use client";

import { useMemo, useState } from "react";
import type { Provider } from "@/lib/domain/types";
import { Topbar } from "@/components/layout/Topbar";
import { SearchField } from "@/components/common/SearchField";
import { ProviderCard } from "./ProviderCard";

export function ProvidersExplorer({
  providers,
  counts,
}: {
  providers: Provider[];
  counts: Record<string, number>;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) =>
      [p.name, p.description, p.category].join(" ").toLowerCase().includes(q),
    );
  }, [search, providers]);

  return (
    <>
      <Topbar>
        <span className="text-[16px] font-semibold tracking-[-0.02em]">Providers</span>
        <span className="text-ink-4">·</span>
        <span className="text-[15px] text-ink-3">
          {search ? `${filtered.length} of ${providers.length}` : `${providers.length} total`}
        </span>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search providers…"
          className="ml-3 w-[clamp(180px,26vw,340px)]"
        />
      </Topbar>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-[15px] text-ink-4">No providers match “{search}”.</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {filtered.map((p) => (
              <ProviderCard key={p.id} provider={p} modelCount={counts[p.id] ?? 0} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
