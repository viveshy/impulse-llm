/** Shapes for the model page: the price sheet as rows, and one row per host. */
import type { Pricing } from "@/lib/domain/types";
import { isFirstParty, isPriceOption } from "./group";
import type { HostKind } from "./hosts";
import type { CanonicalModel, Listing } from "./types";

export interface PriceTier {
  id: string;
  label: string;
  input?: number;
  output?: number | null;
  note?: string;
}

const pct = (ratio: number) => Math.round(Math.abs(1 - ratio) * 100);
const versus = (price: number | undefined, standard: number) =>
  price === undefined || standard <= 0 || price === standard
    ? undefined
    : price < standard
      ? `${pct(price / standard)}% off`
      : `${pct(price / standard)}% more`;

function compact(n: number): string {
  return n >= 1_000_000 ? `${Number((n / 1_000_000).toFixed(1))}M` : `${Math.round(n / 1000)}K`;
}

export function priceTiers(p: Pricing): PriceTier[] {
  const tiers: PriceTier[] = [{ id: "standard", label: "Standard", input: p.inputPerMTok, output: p.outputPerMTok }];
  const std = p.inputPerMTok;
  if (p.cachedInputPerMTok !== undefined) {
    const note = versus(p.cachedInputPerMTok, std);
    tiers.push({ id: "cached", label: "Cached input", input: p.cachedInputPerMTok, ...(note ? { note: `${note} input` } : {}) });
  }
  if (p.cacheWritePerMTok !== undefined) {
    tiers.push({ id: "cache-write", label: "Cache write, 5 minutes", input: p.cacheWritePerMTok });
  }
  if (p.cacheWrite1hPerMTok !== undefined) {
    tiers.push({ id: "cache-write-1h", label: "Cache write, 1 hour", input: p.cacheWrite1hPerMTok });
  }
  const pair = (id: string, label: string, input?: number, output?: number) => {
    if (input === undefined && output === undefined) return;
    const note = versus(input, std);
    tiers.push({ id, label, input, output: output ?? null, ...(note ? { note } : {}) });
  };
  pair("batch", "Batch", p.batchInputPerMTok, p.batchOutputPerMTok);
  pair("flex", "Flex", p.flexInputPerMTok, p.flexOutputPerMTok);
  pair("priority", "Priority", p.priorityInputPerMTok, p.priorityOutputPerMTok);
  if (p.longContext) {
    tiers.push({
      id: "long",
      label: `Prompts over ${compact(p.longContext.thresholdTokens)} tokens`,
      input: p.longContext.inputPerMTok,
      output: p.longContext.outputPerMTok ?? null,
    });
  }
  if (p.webSearchPerQuery !== undefined && p.webSearchPerQuery > 0) {
    tiers.push({ id: "search", label: "Web search", note: `$${(p.webSearchPerQuery * 1000).toFixed(2)} per 1,000 searches` });
  }
  if (p.regionalUplift !== undefined && p.regionalUplift > 1) {
    tiers.push({ id: "regional", label: "Regional endpoints", note: `${pct(p.regionalUplift)}% more` });
  }
  return tiers;
}

export interface HostRow {
  /** The host's main offer: global, current, cheapest. */
  listing: Listing;
  /** The host's other listings (regions, snapshots, variants). */
  others: Listing[];
  /** Price against the model's headline price; null when either isn't a per-token offer. */
  delta: number | null;
}

const KIND_ORDER: HostKind[] = ["first-party", "cloud", "inference", "gateway", "local", "subscription"];

/** What sets a listing apart from its host's plain one: region, deployment, variant, snapshot, speed, fine-tuning. */
export function qualifiers(l: Listing): string[] {
  return [l.region, l.deployment, l.variant, l.snapshot, l.fast ? "fast mode" : "", l.fineTune ? "fine-tuning" : ""].filter(
    (s): s is string => !!s,
  );
}

/** The host's name, qualified when the listing isn't its plain one: `Amazon Bedrock (us-gov-west-1, Mantle)`. */
export function hostLabel(l: Listing): string {
  const q = qualifiers(l);
  return q.length ? `${l.host.name} (${q.join(", ")})` : l.host.name;
}

/** A host's main listing first: global, current, a real per-token offer, cheapest. */
export function mainFirst(a: Listing, b: Listing): number {
  const plain = (l: Listing) => (l.region || l.deployment || l.variant || l.snapshot || l.fast || l.fineTune ? 1 : 0);
  return (
    plain(a) - plain(b) ||
    Number(isPriceOption(b)) - Number(isPriceOption(a)) ||
    (a.blended ?? Infinity) - (b.blended ?? Infinity) ||
    a.apiModelId.length - b.apiModelId.length
  );
}

export function hostRows(m: CanonicalModel): HostRow[] {
  const byHost = new Map<string, Listing[]>();
  for (const l of m.listings) byHost.set(l.hostId, [...(byHost.get(l.hostId) ?? []), l]);
  const ref = m.reference;
  const refPrice = isPriceOption(ref) ? ref.blended : null;

  return [...byHost.values()]
    .map((ls) => {
      const [listing, ...others] = [...ls].sort(mainFirst);
      const delta = refPrice && isPriceOption(listing) && listing.blended ? listing.blended / refPrice - 1 : null;
      return { listing, others, delta };
    })
    .sort((a, b) => {
      const fp = Number(isFirstParty(b.listing, m.labId)) - Number(isFirstParty(a.listing, m.labId));
      const kind = KIND_ORDER.indexOf(a.listing.host.kind) - KIND_ORDER.indexOf(b.listing.host.kind);
      const priced = Number(isPriceOption(b.listing)) - Number(isPriceOption(a.listing));
      return fp || priced || (a.listing.blended ?? Infinity) - (b.listing.blended ?? Infinity) || kind;
    });
}
