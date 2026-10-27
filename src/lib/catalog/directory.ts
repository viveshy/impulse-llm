/** The labs and hosts directories: who makes what, and what each host serves at what price. */
import { isPriceOption } from "./group";
import type { HostKind } from "./hosts";
import { labById, LABS, type LabTier } from "./labs";
import { isRetired } from "./lineage";
import { byNewest, retiring, type RetiringItem } from "./select";
import type { CanonicalModel, CatalogIndex, HostSummary, Listing } from "./types";

const NOT_A_HOST: HostKind[] = ["subscription", "local"];
const TIER_ORDER: Record<LabTier, number> = { frontier: 0, open: 1, other: 2 };
/** How far back a model can have shipped and still count as part of a lab's current lineup. */
const LINEUP_DAYS = 540;

export interface LabSummary {
  slug: string;
  name: string;
  tier: LabTier;
  website?: string;
  /** Models not retired: what the lab page lists. */
  modelCount: number;
  /** General-purpose models in the current lineup, as the lab page shows it. */
  lineupCount: number;
  /** The newest dated general-purpose chat model. */
  newest?: CanonicalModel;
  /** Distinct APIs serving its models (subscriptions and local runtimes excluded). */
  hostCount: number;
}

function byLab(index: CatalogIndex): Map<string, CanonicalModel[]> {
  const groups = new Map<string, CanonicalModel[]>();
  for (const m of index.models) {
    if (m.aliasOnly) continue;
    groups.set(m.labSlug, [...(groups.get(m.labSlug) ?? []), m]);
  }
  return groups;
}

/** Current general-purpose chat models released in the last 18 months, newest first. */
function lineupOf(active: CanonicalModel[], today: string): CanonicalModel[] {
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - LINEUP_DAYS * 86_400_000).toISOString().slice(0, 10);
  return active.filter((m) => m.kind === "chat" && !m.specialPurpose && m.isCurrent && !!m.releaseDate && m.releaseDate >= since);
}

function summarise(slug: string, models: CanonicalModel[], today: string): LabSummary {
  const lab = labById(models[0].labId);
  const hosts = new Set(models.flatMap((m) => m.listings.filter((l) => !NOT_A_HOST.includes(l.host.kind)).map((l) => l.hostId)));
  const active = models.filter((m) => !isRetired(m, today));
  return {
    slug,
    name: lab?.name ?? models[0].labName,
    tier: lab?.tier ?? "other",
    ...(lab?.website ? { website: lab.website } : {}),
    modelCount: active.length,
    lineupCount: lineupOf(active, today).length,
    newest: models.filter((m) => m.kind === "chat" && !m.specialPurpose && m.releaseDate).sort(byNewest)[0],
    hostCount: hosts.size,
  };
}

/** Frontier labs first in their usual order, then the rest by size. */
export function labSummaries(index: CatalogIndex): LabSummary[] {
  const rank = (slug: string) => {
    const i = LABS.findIndex((l) => l.id === slug);
    return i < 0 ? LABS.length : i;
  };
  return [...byLab(index)]
    .map(([slug, models]) => summarise(slug, models, index.today))
    .sort(
      (a, b) =>
        TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
        (a.tier === "frontier" ? rank(a.slug) - rank(b.slug) : 0) ||
        b.modelCount - a.modelCount ||
        a.name.localeCompare(b.name),
    );
}

export interface LabPage {
  summary: LabSummary;
  /** Current general-purpose chat models released in the last 18 months. */
  lineup: CanonicalModel[];
  /** Current image, audio, search and other special-purpose models. */
  specialised: CanonicalModel[];
  /** Everything else still served. */
  older: CanonicalModel[];
  retiring: RetiringItem[];
  hosts: { host: HostSummary; count: number }[];
}

export function labPage(index: CatalogIndex, slug: string): LabPage | null {
  const models = byLab(index).get(slug);
  if (!models) return null;
  const active = models.filter((m) => !isRetired(m, index.today)).sort(byNewest);
  const lineup = lineupOf(active, index.today);
  const specialised = active.filter((m) => !lineup.includes(m) && m.isCurrent && (m.kind !== "chat" || m.specialPurpose));
  const older = active.filter((m) => !lineup.includes(m) && !specialised.includes(m));

  const perHost = new Map<string, Set<string>>();
  for (const m of models) {
    for (const l of m.listings) perHost.set(l.hostId, (perHost.get(l.hostId) ?? new Set()).add(m.slug));
  }
  const hostById = new Map(index.hosts.map((h) => [h.id, h]));
  const hosts = [...perHost]
    .flatMap(([id, set]) => {
      const host = hostById.get(id);
      return host ? [{ host, count: set.size }] : [];
    })
    .sort((a, b) => b.count - a.count || a.host.name.localeCompare(b.host.name));

  return {
    summary: summarise(slug, models, index.today),
    lineup,
    specialised,
    older,
    retiring: retiring(index, { fromDays: 0, toDays: 365, tier: "all", apiOnly: true }).filter(
      (r) => r.model.labSlug === slug,
    ),
    hosts,
  };
}

export interface HostOffer {
  model: CanonicalModel;
  /** The cheapest real price on this host, else its first listing (a subscription, say). */
  listing: Listing;
  /** More listings of the model on this host: regions, deployments, snapshots. */
  otherListings: number;
  /** Price against the model's headline at another host, as a ratio minus one. */
  vsHeadline: number | null;
}

export interface HostPage {
  host: HostSummary;
  /** The lab whose own API this is. */
  labSlug?: string;
  offers: HostOffer[];
}

export function hostPage(index: CatalogIndex, slug: string): HostPage | null {
  const host = index.hostBySlug.get(slug);
  if (!host) return null;
  const offers: HostOffer[] = [];
  let labSlug: string | undefined;
  for (const m of index.models) {
    if (m.aliasOnly) continue;
    const here = m.listings.filter((l) => l.hostId === host.id);
    if (!here.length) continue;
    labSlug ??= here[0].host.labId;
    const priced = here.filter(isPriceOption).sort((a, b) => a.blended! - b.blended!);
    const listing = priced[0] ?? here[0];
    const ref = m.reference;
    const comparable = priced.length > 0 && ref.hostId !== host.id && isPriceOption(ref) && !!ref.blended;
    offers.push({
      model: m,
      listing,
      otherListings: here.length - 1,
      vsHeadline: comparable ? listing.blended! / ref.blended! - 1 : null,
    });
  }
  offers.sort((a, b) => TIER_ORDER[a.model.tier] - TIER_ORDER[b.model.tier] || byNewest(a.model, b.model));
  return { host, ...(labSlug ? { labSlug } : {}), offers };
}
