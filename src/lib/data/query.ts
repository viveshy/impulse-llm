/**
 * Pure in-memory query logic over the domain model - the single implementation
 * `HttpDataSource` runs over records loaded from the real API, so filtering,
 * sorting and faceting live in one place and are easy to reason about and test.
 */
import { CAPABILITY_KEYS } from "@/lib/domain/types";
import type { Facets, Model, ModelQuery, Provider } from "@/lib/domain/types";

export function matchesQuery(m: Model, q: ModelQuery, providerName: (id: string) => string): boolean {
  if (!q.includeDeprecated && m.deprecation === "deprecated") return false;
  if (q.providerIds?.length && !q.providerIds.includes(m.providerId)) return false;
  if (q.capabilities?.length && !q.capabilities.every((c) => m.capabilities[c])) return false;
  if (q.openOnly && !m.openness.isOpenWeights) return false;
  if (q.maxInputPrice !== undefined && m.pricing.inputPerMTok > q.maxInputPrice) return false;
  if (q.minContext !== undefined && m.context.contextWindow < q.minContext) return false;

  if (q.search) {
    const needle = q.search.trim().toLowerCase();
    if (needle) {
      const hay = [m.name, m.family ?? "", providerName(m.providerId), ...(m.tags ?? [])]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(needle)) return false;
    }
  }
  return true;
}

export function sortModels(list: Model[], sort: ModelQuery["sort"] = "popularity"): Model[] {
  const out = [...list];
  switch (sort) {
    case "priceInputAsc":
      out.sort((a, b) => a.pricing.inputPerMTok - b.pricing.inputPerMTok);
      break;
    case "priceInputDesc":
      out.sort((a, b) => b.pricing.inputPerMTok - a.pricing.inputPerMTok);
      break;
    case "contextDesc":
      out.sort((a, b) => b.context.contextWindow - a.context.contextWindow);
      break;
    case "releaseDesc":
      out.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
      break;
    case "nameAsc":
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "popularity":
    default:
      out.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }
  return out;
}

export const MODELS_PAGE_SIZE = 50;

export interface ModelPage {
  items: Model[];
  /** The last item's id, to pass back as `cursor` for the next page. null when exhausted. */
  nextCursor: string | null;
  /** Total matching count across all pages (same value on every page of one query). */
  total: number;
}

/**
 * Cursor pagination over an already filtered+sorted list. The cursor is a model id
 * (opaque to callers): we resume right after that id in the CURRENT sort order, rather
 * than an offset, so a stale/unknown cursor degrades gracefully (starts over) instead of
 * skipping or duplicating rows if the underlying catalog changed between requests.
 */
export function paginateModels(models: Model[], opts: { cursor?: string | null; limit: number }): ModelPage {
  const { cursor, limit } = opts;
  const start = cursor ? Math.max(0, models.findIndex((m) => m.id === cursor) + 1) : 0;
  const items = models.slice(start, start + limit);
  const last = items[items.length - 1];
  const nextCursor = last && start + limit < models.length ? last.id : null;
  return { items, nextCursor, total: models.length };
}

export function computeFacets(models: Model[], providers: Provider[]): Facets {
  const visible = models.filter((m) => m.deprecation !== "deprecated");

  const providerCounts = new Map<string, number>();
  for (const m of visible) providerCounts.set(m.providerId, (providerCounts.get(m.providerId) ?? 0) + 1);

  const facetProviders = providers
    .map((p) => ({ id: p.id, name: p.name, count: providerCounts.get(p.id) ?? 0 }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);

  const capabilities = CAPABILITY_KEYS.map((key) => ({
    key,
    count: visible.filter((m) => m.capabilities[key]).length,
  })).filter((c) => c.count > 0);

  const inputs = visible.map((m) => m.pricing.inputPerMTok);
  const contexts = visible.map((m) => m.context.contextWindow);

  return {
    providers: facetProviders,
    capabilities,
    priceInputRange: [Math.min(...inputs), Math.max(...inputs)],
    contextRange: [Math.min(...contexts), Math.max(...contexts)],
    total: visible.length,
  };
}
