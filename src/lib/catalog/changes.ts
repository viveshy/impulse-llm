/**
 * Price moves worth showing. The sync records every list-price change; this nets each
 * listing's changes over the window, drops listings that merely got their first price
 * (subscription plans especially) and prices that fell to zero (missing data, not a cut),
 * and keeps one move per model and host: the host's main listing when several of its
 * listings moved, so a GovCloud region's move doesn't stand in for the host's price.
 */
import type { PriceChange } from "@/lib/domain/types";
import { mainFirst } from "./detail";
import { blended } from "./group";
import type { HostKind } from "./hosts";
import type { CanonicalModel, CatalogIndex, Listing } from "./types";

export interface PricePoint {
  input: number | null;
  output: number | null;
}

export interface ListingMove {
  from: PricePoint;
  to: PricePoint;
  /** Blended (3:1) change: -0.5 is a 50% cut. */
  change: number;
  /** ISO day of the latest change. */
  at: string;
}

export interface PriceMove extends ListingMove {
  model: CanonicalModel;
  listing: Listing;
}

const NOT_A_PRICE: HostKind[] = ["subscription", "local"];

const point = (s: PriceChange["from"]): PricePoint => ({ input: s.inputPerMTok, output: s.outputPerMTok });
const isPriced = (p: PricePoint) => (p.input ?? 0) > 0 || (p.output ?? 0) > 0;
const fellToZero = (a: PricePoint, b: PricePoint) =>
  ((a.input ?? 0) > 0 && (b.input ?? 0) <= 0) || ((a.output ?? 0) > 0 && (b.output ?? 0) <= 0);

/** Each listing's net move over the window, by listing id, when it is a real move between two real prices. */
export function listingMoves(changes: PriceChange[]): Map<string, ListingMove> {
  // Oldest first, so a listing's earliest `from` and latest `to` bracket the window.
  const net = new Map<string, { from: PricePoint; to: PricePoint; at: string }>();
  for (const c of [...changes].sort((a, b) => a.at.localeCompare(b.at))) {
    const prev = net.get(c.listingId);
    net.set(c.listingId, {
      from: prev && isPriced(prev.from) ? prev.from : point(c.from),
      to: point(c.to),
      at: c.at.slice(0, 10),
    });
  }

  const out = new Map<string, ListingMove>();
  for (const [id, { from, to, at }] of net) {
    if (!isPriced(from) || !isPriced(to) || fellToZero(from, to)) continue;
    const before = blended(from.input ?? 0, from.output);
    const after = blended(to.input ?? 0, to.output);
    if (!before || !after || Math.abs(after / before - 1) < 0.005) continue;
    out.set(id, { from, to, change: after / before - 1, at });
  }
  return out;
}

export function priceMoves(changes: PriceChange[], index: CatalogIndex): PriceMove[] {
  const moves = new Map<string, PriceMove>();
  for (const [id, move] of listingMoves(changes)) {
    const model = index.byListingId.get(id);
    const listing = model?.listings.find((l) => l.id === id);
    if (!model || !listing || NOT_A_PRICE.includes(listing.host.kind)) continue;
    const key = `${model.slug}|${listing.hostId}`;
    const seen = moves.get(key);
    if (!seen || mainFirst(listing, seen.listing) < 0) moves.set(key, { model, listing, ...move });
  }
  return [...moves.values()].sort((a, b) =>
    a.at === b.at ? Math.abs(b.change) - Math.abs(a.change) : a.at < b.at ? 1 : -1,
  );
}
