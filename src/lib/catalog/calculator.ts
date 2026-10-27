/** Which models the cost calculator offers, slimmed down to what its estimate needs. */
import type { CalcRow, Offer, SlimPricing } from "@/lib/calculator";
import type { Pricing } from "@/lib/domain/types";
import { hostLabel } from "./detail";
import { byPreference, isPriceOption, soldByLab } from "./group";
import { isRetired } from "./lineage";
import type { CanonicalModel, CatalogIndex } from "./types";

/** Open-weight models older than this are only priced when asked for by name. */
const OPEN_DAYS = 540;

/** Leaves out the prices a host doesn't list: hundreds of rows ship with the page, and an empty key still costs bytes. */
function defined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function slim(p: Pricing): SlimPricing {
  return defined({
    inputPerMTok: p.inputPerMTok,
    outputPerMTok: p.outputPerMTok,
    cachedInputPerMTok: p.cachedInputPerMTok,
    batchInputPerMTok: p.batchInputPerMTok,
    batchOutputPerMTok: p.batchOutputPerMTok,
    longContext: p.longContext && defined(p.longContext),
  });
}

/**
 * One offer per distinct price sheet, preferred host first, leaving out copies of the headline price. The calculator
 * picks among them per workload: a host with the lowest list price can still lose on batch or cache prices.
 * Fast-mode listings sell speed at a premium, so they are left out.
 */
function offers(m: CanonicalModel, headline: SlimPricing | undefined): Offer[] {
  const seen = new Set(headline ? [JSON.stringify(headline)] : []);
  const out: Offer[] = [];
  for (const l of byPreference(m.listings.filter((l) => isPriceOption(l) && !l.fast), m.labId)) {
    const p = slim(l.pricing);
    const key = JSON.stringify(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ p, h: hostLabel(l) });
  }
  return out;
}

/** Superseded in its line, or a closed frontier model its own lab no longer sells (only a cloud or a reseller still does). */
function isOlder(m: CanonicalModel): boolean {
  return !m.isCurrent || (m.tier === "frontier" && !m.openWeights && !soldByLab(m));
}

function toRow(m: CanonicalModel): CalcRow | null {
  const lab = isPriceOption(m.reference) ? slim(m.reference.pricing) : undefined;
  const alt = offers(m, lab);
  if (!lab && !alt.length) return null;
  return {
    s: m.slug,
    l: m.labSlug,
    n: m.name,
    ln: m.labName,
    lh: hostLabel(m.reference),
    t: m.tier,
    ...(m.releaseDate ? { r: m.releaseDate } : {}),
    ctx: m.contextWindow || 0,
    ...(isOlder(m) ? { old: true as const } : {}),
    ...(m.openWeights ? { ow: true as const } : {}),
    ...(lab ? { lab } : {}),
    ...(alt.length ? { alt } : {}),
  };
}

/** Every general-purpose frontier chat model still on sale, recent open-weight ones, and any model named in `include`. */
export function calculatorRows(index: CatalogIndex, include: string[] = []): CalcRow[] {
  const since = new Date(Date.parse(`${index.today}T00:00:00Z`) - OPEN_DAYS * 86_400_000).toISOString().slice(0, 10);
  const wanted = new Set(include);
  const rows: CalcRow[] = [];
  for (const m of index.models) {
    const listed =
      m.kind === "chat" &&
      !m.specialPurpose &&
      !m.aliasOnly &&
      !isRetired(m, index.today) &&
      (m.tier === "frontier" || (m.tier === "open" && m.isCurrent && !!m.releaseDate && m.releaseDate >= since));
    if (!listed && !wanted.has(m.slug)) continue;
    const row = toRow(m);
    if (row) rows.push(row);
  }
  return rows;
}
