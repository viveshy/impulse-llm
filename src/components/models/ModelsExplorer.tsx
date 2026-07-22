"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useFacets, useModelsInfinite, useProviders } from "@/lib/query/hooks";
import { parseModelQuery, serializeModelQuery } from "@/lib/models-query-url";
import { useModelsView } from "@/lib/prefs";
import type { Facets, ModelQuery, Provider } from "@/lib/domain/types";
import type { ModelPage } from "@/lib/data/query";
import { Topbar } from "@/components/layout/Topbar";
import { SearchField } from "@/components/common/SearchField";
import { FilterBar } from "./FilterBar";
import { ModelList } from "./ModelList";
import { ModelCard } from "./ModelCard";

export function ModelsExplorer({
  initialQuery,
  initialPage,
  initialProviders,
  initialFacets,
}: {
  initialQuery: ModelQuery;
  initialPage: ModelPage;
  initialProviders: Provider[];
  initialFacets: Facets;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseModelQuery(searchParams), [searchParams]);
  const [view, setView] = useModelsView();

  // Seed React Query with the server's first page only for the query the server
  // rendered, so the first client render matches the server exactly (no hydration
  // drift) and switches to live cursor pagination as soon as filters change.
  const isInitialQuery = JSON.stringify(query) === JSON.stringify(initialQuery);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useModelsInfinite(
    query,
    isInitialQuery ? initialPage : undefined,
  );
  const { data: providers = initialProviders } = useProviders(initialProviders);
  const { data: facets = initialFacets } = useFacets(initialFacets);

  const models = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? initialPage.items,
    [data, initialPage],
  );
  const total = data?.pages[0]?.total ?? initialPage.total;

  const providerName = useMemo(() => new Map(providers.map((p) => [p.id, p.name])), [providers]);
  const monogram = useMemo(() => new Map(providers.map((p) => [p.id, p.monogram])), [providers]);

  const onChange = (next: ModelQuery) => {
    const qs = serializeModelQuery(next).toString();
    router.replace(qs ? `/app/models?${qs}` : "/app/models", { scroll: false });
  };

  return (
    <>
      <Topbar>
        <span className="text-[16px] font-semibold tracking-[-0.02em]">Models</span>
        <span className="text-ink-4">·</span>
        <span className="text-[15px] text-ink-3">{facets.total} total</span>
        <SearchField
          value={query.search ?? ""}
          onChange={(v) => onChange({ ...query, search: v || undefined })}
          placeholder="Search models…"
          className="ml-3 w-[clamp(180px,26vw,340px)]"
        />
      </Topbar>

      <FilterBar
        facets={facets}
        query={query}
        onChange={onChange}
        view={view}
        onViewChange={setView}
        count={total}
      />

      {view === "list" ? (
        <ModelList models={models} providerName={providerName} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {models.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                providerName={providerName.get(m.providerId) ?? m.providerId}
                monogram={monogram.get(m.providerId) ?? "?"}
              />
            ))}
          </div>
        </div>
      )}

      {hasNextPage && (
        <div className="flex flex-none items-center justify-center border-t border-border py-[10px]">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-[7px] border border-border-strong px-[14px] py-[7px] text-[14px] text-ink-2 transition-colors hover:text-ink disabled:opacity-50"
          >
            {isFetchingNextPage
              ? "Loading…"
              : `Load more (${Math.max(0, total - models.length)} remaining)`}
          </button>
        </div>
      )}
    </>
  );
}
