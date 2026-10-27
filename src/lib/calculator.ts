/** The cost calculator's maths and URL state. Runs in the browser, so it imports types only from the catalog. */
import { monthlyCost, PRESETS, type CostEstimate, type Workload } from "@/lib/catalog/cost";
import type { LabTier } from "@/lib/catalog/labs";
import type { Pricing } from "@/lib/domain/types";

export type SlimPricing = Pick<
  Pricing,
  "inputPerMTok" | "outputPerMTok" | "cachedInputPerMTok" | "batchInputPerMTok" | "batchOutputPerMTok" | "longContext"
>;

/** One model as the calculator sees it. Short keys: hundreds of these ship with the page. */
export interface CalcRow {
  s: string; // slug
  l: string; // lab slug
  n: string; // name
  ln: string; // lab name
  lh: string; // host of the headline price, usually the lab's own API
  t: LabTier;
  r?: string; // release date
  ctx: number; // context window, 0 when unknown
  old?: true; // superseded by a newer model in its line, or no longer sold by its own lab
  ow?: true; // open weights
  lab?: SlimPricing; // headline price
  alt?: Offer[]; // every other per-token price sheet, preferred host first
}

export interface Offer {
  p: SlimPricing;
  h: string; // host, with the region or deployment when the price is only there
}

export type PriceSource = "lab" | "cheapest";

/** Current closed frontier models, plus open-weight and older ones when asked; pinned models always. */
export function visibleRows(rows: CalcRow[], opts: { open: boolean; older: boolean; pinned: string[] }): CalcRow[] {
  return rows.filter(
    (r) => opts.pinned.includes(r.s) || ((opts.open || (r.t === "frontier" && !r.ow)) && (opts.older || !r.old)),
  );
}

export interface CalcResult {
  row: CalcRow;
  est: CostEstimate;
  /** Where the price comes from. */
  host: string;
  /** The request fits in the context window. */
  fits: boolean;
}

/** The offer with the smallest bill for this workload (batch, cache and long-prompt prices count); on a tie, the first. */
function cheapestFor(offers: Offer[], w: Workload): { est: CostEstimate; h: string } | undefined {
  let best: { est: CostEstimate; h: string } | undefined;
  for (const o of offers) {
    const est = monthlyCost(o.p, w);
    if (est && (!best || est.total < best.est.total)) best = { est, h: o.h };
  }
  return best;
}

/** Every model's monthly bill for the workload, cheapest first; requests that overflow the context go last. */
export function priceAll(rows: CalcRow[], w: Workload, source: PriceSource): CalcResult[] {
  const out: CalcResult[] = [];
  for (const row of rows) {
    const lab: Offer[] = row.lab ? [{ p: row.lab, h: row.lh }] : [];
    const pick = cheapestFor(source === "lab" && lab.length ? lab : [...lab, ...(row.alt ?? [])], w);
    if (!pick) continue;
    out.push({
      row,
      est: pick.est,
      host: pick.h,
      fits: !row.ctx || w.inputTokens + w.outputTokens <= row.ctx,
    });
  }
  return out.sort((a, b) => Number(b.fits) - Number(a.fits) || a.est.total - b.est.total || a.row.n.localeCompare(b.row.n));
}

export interface FoldedResult extends CalcResult {
  /** Names folded into this row: the same model's variants at exactly the same price. */
  variants: string[];
}

/** "Grok 4.20 Beta Reasoning" -> "Grok 4.20": the name up to its version number. */
function versionStem(name: string): string {
  const words = name.split(" ");
  const i = words.findIndex((w) => /\d/.test(w));
  return i < 0 ? name : words.slice(0, i + 1).join(" ");
}

/**
 * Variants of one model that cost exactly the same ("Grok 4.20 Reasoning", "Grok 4.20 Non-Reasoning") share a row,
 * under the shortest name. Pinned models keep their own rows.
 */
export function foldVariants(results: CalcResult[], pinned: string[]): FoldedResult[] {
  const groups = new Map<string, CalcResult[]>();
  const order: (string | CalcResult)[] = [];
  for (const r of results) {
    if (pinned.includes(r.row.s)) {
      order.push(r);
      continue;
    }
    const key = [r.row.l, versionStem(r.row.n), r.host, r.row.ctx, r.fits, JSON.stringify(r.est)].join("|");
    const group = groups.get(key);
    if (group) group.push(r);
    else {
      groups.set(key, [r]);
      order.push(key);
    }
  }
  return order.map((o) => {
    if (typeof o !== "string") return { ...o, variants: [] };
    const [head, ...rest] = [...groups.get(o)!].sort((a, b) => a.row.n.length - b.row.n.length || a.row.n.localeCompare(b.row.n));
    return { ...head, variants: rest.map((r) => r.row.n).sort((a, b) => a.localeCompare(b)) };
  });
}

export const MAX_CACHE = 0.95;
const DEFAULT = PRESETS[0].workload;

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function positive(v: string | string[] | undefined, fallback: number): number {
  const n = Math.round(Number(one(v)));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** `rpd`, `in`, `out`, `cache` (percent) and `batch=1`; anything missing or invalid takes the default preset's value. */
export function parseWorkload(sp: Params): Workload {
  const cache = Number(one(sp.cache));
  return {
    requestsPerDay: positive(sp.rpd, DEFAULT.requestsPerDay),
    inputTokens: positive(sp.in, DEFAULT.inputTokens),
    outputTokens: positive(sp.out, DEFAULT.outputTokens),
    cacheHitRate:
      one(sp.cache) !== undefined && Number.isFinite(cache)
        ? Math.min(Math.max(cache, 0), MAX_CACHE * 100) / 100
        : DEFAULT.cacheHitRate,
    batch: one(sp.batch) !== undefined ? one(sp.batch) === "1" : DEFAULT.batch,
  };
}

export function workloadParams(w: Workload): Record<string, string> {
  return {
    rpd: String(w.requestsPerDay),
    in: String(w.inputTokens),
    out: String(w.outputTokens),
    cache: String(Math.round(w.cacheHitRate * 100)),
    ...(w.batch ? { batch: "1" } : {}),
  };
}
