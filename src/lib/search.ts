/** Client-side model search over the compact /api/search-index rows. */
import type { SearchRow } from "@/lib/catalog/select";

type Named = { s: string; n: string; c: number };
export type SearchIndex = { models: SearchRow[]; labs: Named[]; hosts: Named[] };

export const normQuery = (s: string) => s.toLowerCase().replace(/[\s._/:-]+/g, "");

let cache: Promise<SearchIndex> | null = null;

/** Fetched once per page load and shared by every search box. */
export function loadSearchIndex(): Promise<SearchIndex> {
  cache ??= fetch("/api/search-index")
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<SearchIndex>;
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}

/** Name prefix, then name, then slug, then any API id; frontier labs first at each level. */
export function rankModels(rows: SearchRow[], q: string, opts: { kind?: SearchRow["k"]; limit?: number } = {}): SearchRow[] {
  const pool = opts.kind ? rows.filter((r) => r.k === opts.kind) : rows;
  const needle = normQuery(q);
  if (!needle) return pool.filter((r) => r.t === "frontier" && r.k === "chat").slice(0, 8);
  const scored: { r: SearchRow; score: number; i: number }[] = [];
  pool.forEach((r, i) => {
    const name = normQuery(r.n);
    let score = -1;
    if (name.startsWith(needle)) score = 0;
    else if (name.includes(needle)) score = 1;
    else if (normQuery(r.s).includes(needle)) score = 2;
    else if (r.a.some((id) => normQuery(id).includes(needle))) score = 3;
    if (score >= 0) scored.push({ r, score: score * 2 + (r.t === "frontier" ? 0 : 1), i });
  });
  return scored
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .slice(0, opts.limit ?? 30)
    .map((x) => x.r);
}
