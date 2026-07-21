"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useFacets, useModels, useProviders } from "@/lib/query/hooks";
import { parseModelQuery, serializeModelQuery } from "@/lib/models-query-url";
import { useModelsView } from "@/lib/prefs";
import type { Facets, Model, ModelQuery, Provider } from "@/lib/domain/types";
import { Topbar } from "@/components/layout/Topbar";
import { SearchField } from "@/components/common/SearchField";
import { FilterBar } from "./FilterBar";
import { ModelList } from "./ModelList";
import { ModelCard } from "./ModelCard";


export function ModelsExplorer({
  initialQuery,
  initialModels,
  initialProviders,
  initialFacets,
}: {
  initialQuery: ModelQuery;
  initialModels: Model[];
  initialProviders: Provider[];
  initialFacets: Facets;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseModelQuery(searchParams), [searchParams]);
  const [view, setView] = useModelsView();

  // Seed React Query with server data only for the query the server rendered,
  // so the first client render matches the server exactly (no hydration drift).
  const isInitialQuery = JSON.stringify(query) === JSON.stringify(initialQuery);

  const { data: models = initialModels } = useModels(
    query,
    isInitialQuery ? initialModels : undefined,
  );
  const { data: providers = initialProviders } = useProviders(initialProviders);
  const { data: facets = initialFacets } = useFacets(initialFacets);

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
        count={models.length}
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
    </>
  );
}
