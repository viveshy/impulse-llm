/** The /models filters as URL search params, both ways. */
import type { ModelFilter, ModelSortKey, TierFilter } from "@/lib/catalog/select";
import type { ModelKind } from "@/lib/catalog/types";

export type ModelsQuery = ModelFilter & { page: number };
type Params = Record<string, string | string[] | undefined>;

const TIERS: TierFilter[] = ["frontier", "open", "other", "all"];
const KINDS: (ModelKind | "all")[] = [
  "chat",
  "image",
  "video",
  "speech",
  "transcription",
  "realtime",
  "embedding",
  "rerank",
  "moderation",
  "search",
  "ocr",
  "other",
  "all",
];
const SORTS: ModelSortKey[] = ["newest", "price", "context", "hosts", "name"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]) =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export function parseModelFilter(sp: Params): ModelsQuery {
  const out: ModelsQuery = { page: 1 };
  const tier = oneOf(first(sp.tier), TIERS);
  const kind = oneOf(first(sp.kind), KINDS);
  const sort = oneOf(first(sp.sort), SORTS);
  const lab = first(sp.lab);
  const q = first(sp.q);
  const page = Number(first(sp.page));
  if (tier) out.tier = tier;
  if (lab && /^[a-z0-9-]{1,40}$/.test(lab)) out.lab = lab;
  if (kind) out.kind = kind;
  if (q) out.q = q.slice(0, 100);
  if (sort) out.sort = sort;
  if (first(sp.retired) === "1") out.includeRetired = true;
  if (Number.isInteger(page) && page > 1) out.page = page;
  return out;
}

/** The URL for the current filters with `patch` applied; any change but the page goes back to page 1. */
export function filterHref(current: ModelsQuery, patch: Partial<ModelsQuery>): string {
  const next: ModelsQuery = { ...current, ...patch };
  if (!("page" in patch)) next.page = 1;
  const params = new URLSearchParams();
  if (next.tier) params.set("tier", next.tier);
  if (next.lab) params.set("lab", next.lab);
  if (next.kind && next.kind !== "chat") params.set("kind", next.kind);
  if (next.q) params.set("q", next.q);
  if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
  if (next.includeRetired) params.set("retired", "1");
  if (next.page > 1) params.set("page", String(next.page));
  const qs = params.toString();
  return qs ? `/models?${qs}` : "/models";
}
