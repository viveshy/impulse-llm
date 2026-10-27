/**
 * Cheaper ways to get the job done. Four buckets, each strictly cheaper (blended 3:1)
 * than the target's headline price: the same model elsewhere, a smaller model from the
 * same lab, other frontier labs, and open-weight picks at their cheapest host.
 */
import type { CapabilityKey } from "@/lib/domain/types";
import { cheapestListing, isPriceOption, soldByLab } from "./group";
import { byNewest } from "./select";
import type { CanonicalModel, CatalogIndex, Listing } from "./types";

/** The capabilities that decide whether a model can stand in for another. */
export const KEY_CAPS: CapabilityKey[] = [
  "toolCalling",
  "functionCalling",
  "vision",
  "reasoning",
  "structuredOutputs",
  "promptCaching",
];

/** A stand-in must have at least this share of the target's key capabilities. */
const MIN_COVERAGE = 0.6;

export interface Alternative {
  model: CanonicalModel;
  /** The offer being suggested (a host listing). */
  listing: Listing;
  /** 0..1 fraction saved on blended price; null when the target has no price. */
  saving: number | null;
  /** 0..1 share of the target's key capabilities this one has. */
  coverage: number;
  missing: CapabilityKey[];
}

export interface AlternativeBuckets {
  cheaperHosts: Alternative[];
  sameLab: Alternative[];
  frontier: Alternative[];
  openWeight: Alternative[];
  /** False when the target has no listed price: buckets are then "similar", not "cheaper". */
  priced: boolean;
}

/** The lab's own price where it has one, else the cheapest host. */
function headlineOffer(m: CanonicalModel): Listing | undefined {
  return isPriceOption(m.reference) ? m.reference : cheapestListing(m);
}

/** Picks up to `limit`, one per lab first so one lab can't fill the list. */
function diverse(items: Alternative[], limit: number): Alternative[] {
  const picked: Alternative[] = [];
  const labs = new Set<string | null>();
  for (const a of items) {
    if (picked.length >= limit) break;
    if (!labs.has(a.model.labId)) {
      picked.push(a);
      labs.add(a.model.labId);
    }
  }
  for (const a of items) {
    if (picked.length >= limit) break;
    if (!picked.includes(a)) picked.push(a);
  }
  return picked;
}

export function findAlternatives(target: CanonicalModel, index: CatalogIndex): AlternativeBuckets {
  const targetOffer = isPriceOption(target.reference) ? target.reference : undefined;
  const price = targetOffer?.blended ?? null;
  const wanted = KEY_CAPS.filter((k) => target.capabilities.includes(k));
  const minContext = Math.min(target.contextWindow || 0, 128_000);
  const yearAgo = new Date(Date.parse(`${index.today}T00:00:00Z`) - 365 * 86_400_000).toISOString().slice(0, 10);

  const describe = (model: CanonicalModel, listing: Listing): Alternative => {
    const missing = wanted.filter((k) => !listing.capabilities.includes(k) && !model.capabilities.includes(k));
    return {
      model,
      listing,
      saving: price ? 1 - listing.blended! / price : null,
      coverage: wanted.length ? (wanted.length - missing.length) / wanted.length : 1,
      missing,
    };
  };
  const cheaper = (l: Listing | undefined): l is Listing => !!l && (price === null || l.blended! < price);

  const cheaperHosts =
    price === null
      ? []
      : target.listings
          .filter((l) => isPriceOption(l) && l !== targetOffer && l.blended! < price * 0.99)
          .sort((a, b) => a.blended! - b.blended!)
          .slice(0, 5)
          .map((l) => describe(target, l));

  const pool = index.models.filter(
    (m) =>
      m !== target &&
      m.kind === target.kind &&
      m.isCurrent &&
      !m.preview &&
      !m.aliasOnly &&
      (target.specialPurpose || !m.specialPurpose) &&
      m.contextWindow >= minContext,
  );

  // Most capable first: full coverage, shipped in the last year, then the closest price
  // below the target (price is the best capability proxy the catalog has).
  const fresh = (m: CanonicalModel) => (m.releaseDate && m.releaseDate >= yearAgo ? 1 : 0);
  const rank = (a: Alternative, b: Alternative) =>
    b.coverage - a.coverage ||
    fresh(b.model) - fresh(a.model) ||
    b.listing.blended! - a.listing.blended! ||
    byNewest(a.model, b.model);

  const offers = (models: CanonicalModel[], pick: (m: CanonicalModel) => Listing | undefined) =>
    models.flatMap((m) => {
      const l = pick(m);
      if (!cheaper(l)) return [];
      const alt = describe(m, l);
      return alt.coverage >= MIN_COVERAGE ? [alt] : [];
    });

  const sameLab = target.labId
    ? offers(pool.filter((m) => m.labId === target.labId && !m.openWeights && soldByLab(m)), headlineOffer)
        .sort(rank)
        .slice(0, 3)
    : [];
  const frontier = diverse(
    offers(pool.filter((m) => m.tier === "frontier" && m.labId !== target.labId && soldByLab(m)), headlineOffer).sort(rank),
    4,
  );
  const openWeight = diverse(offers(pool.filter((m) => m.openWeights), cheapestListing).sort(rank), 4);

  return { cheaperHosts, sameLab, frontier, openWeight, priced: price !== null };
}
