/** The /compare page's URL format and the "best in row" marker. */
import type { CanonicalModel, CatalogIndex } from "@/lib/catalog/types";

export const MAX_COMPARE = 4;

/** `m=lab/model,lab/model` (or bare model slugs) into models, in order, deduped, at most four. */
export function parseCompareParam(index: CatalogIndex, raw: string | string[] | undefined): CanonicalModel[] {
  const parts = (Array.isArray(raw) ? raw.join(",") : (raw ?? "")).split(",");
  const out: CanonicalModel[] = [];
  for (const part of parts) {
    const slug = part.trim().split("/").pop()?.toLowerCase();
    const m = slug ? index.bySlug.get(slug) : undefined;
    if (m && !out.includes(m)) out.push(m);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

/** Positions holding the best value, when at least two are known and they differ. */
export function bestIndices(values: (number | null | undefined)[], better: "low" | "high"): Set<number> {
  const known = values.flatMap((v, i) => (v === null || v === undefined ? [] : [{ v, i }]));
  if (known.length < 2) return new Set();
  const best = better === "low" ? Math.min(...known.map((k) => k.v)) : Math.max(...known.map((k) => k.v));
  const hits = known.filter((k) => k.v === best).map((k) => k.i);
  return hits.length === known.length ? new Set() : new Set(hits);
}
