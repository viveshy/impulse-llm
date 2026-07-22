import { Suspense } from "react";
import type { Metadata } from "next";
import { getDataSource } from "@/lib/data";
import { MODELS_PAGE_SIZE } from "@/lib/data/query";
import { parseModelQuery } from "@/lib/models-query-url";
import { ModelsExplorer } from "@/components/models/ModelsExplorer";

export const metadata: Metadata = { title: "Models" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ModelsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") params.set(k, v);
    else if (Array.isArray(v) && v[0]) params.set(k, v[0]);
  }
  const query = parseModelQuery(params);

  const ds = getDataSource();
  const [page, providers, facets] = await Promise.all([
    ds.getModelsPage(query, null, MODELS_PAGE_SIZE),
    ds.getProviders(),
    ds.getFacets(),
  ]);

  return (
    <Suspense fallback={<div className="p-6 text-[15px] text-ink-4">Loading…</div>}>
      <ModelsExplorer
        initialQuery={query}
        initialPage={page}
        initialProviders={providers}
        initialFacets={facets}
      />
    </Suspense>
  );
}
