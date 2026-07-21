import { CAPABILITY_KEYS } from "@/lib/domain/types";
import type { CapabilityKey, ModelQuery, ModelSort } from "@/lib/domain/types";

const SORTS: ModelSort[] = [
  "popularity",
  "priceInputAsc",
  "priceInputDesc",
  "contextDesc",
  "releaseDesc",
  "nameAsc",
];

const CAP_SET = new Set<string>(CAPABILITY_KEYS);

interface ParamsLike {
  get(key: string): string | null;
}

/** Parse URL search params into a typed ModelQuery. Invalid values are ignored. */
export function parseModelQuery(params: ParamsLike): ModelQuery {
  const query: ModelQuery = {};

  const search = params.get("q");
  if (search) query.search = search;

  const providers = params.get("providers");
  if (providers) query.providerIds = providers.split(",").filter(Boolean);

  const caps = params.get("caps");
  if (caps) {
    const valid = caps.split(",").filter((c): c is CapabilityKey => CAP_SET.has(c));
    if (valid.length) query.capabilities = valid;
  }

  if (params.get("open") === "1") query.openOnly = true;

  const sort = params.get("sort");
  if (sort && SORTS.includes(sort as ModelSort)) query.sort = sort as ModelSort;

  return query;
}

/** Serialize a ModelQuery back to a URLSearchParams (stable key order). */
export function serializeModelQuery(query: ModelQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.providerIds?.length) params.set("providers", query.providerIds.join(","));
  if (query.capabilities?.length) params.set("caps", query.capabilities.join(","));
  if (query.openOnly) params.set("open", "1");
  if (query.sort && query.sort !== "popularity") params.set("sort", query.sort);
  return params;
}

export const SORT_LABELS: Record<ModelSort, string> = {
  popularity: "Popularity",
  priceInputAsc: "Price: low to high",
  priceInputDesc: "Price: high to low",
  contextDesc: "Context: largest",
  releaseDesc: "Newest",
  nameAsc: "Name: A-Z",
};
