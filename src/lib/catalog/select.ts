/** Views over the canonical index: release radar, lineup, retirements, the models table. */
import { isFirstParty, retiresOn, soldByLab } from "./group";
import type { HostKind } from "./hosts";
import { LABS, type Lab, type LabTier } from "./labs";
import { isRetired } from "./lineage";
import type { CanonicalModel, CatalogIndex, Listing, ModelKind } from "./types";

const DAY_MS = 86_400_000;

export function addDays(isoDay: string, days: number): string {
  return new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(fromIsoDay: string, toIsoDay: string): number {
  return Math.round((Date.parse(`${toIsoDay}T00:00:00Z`) - Date.parse(`${fromIsoDay}T00:00:00Z`)) / DAY_MS);
}

/** Dated models first, newest first; then by version, then name. */
export function byNewest(a: CanonicalModel, b: CanonicalModel): number {
  if (a.releaseDate && b.releaseDate && a.releaseDate !== b.releaseDate) return a.releaseDate < b.releaseDate ? 1 : -1;
  if (!!a.releaseDate !== !!b.releaseDate) return a.releaseDate ? -1 : 1;
  return b.hostCount - a.hostCount || a.name.localeCompare(b.name);
}

export type TierFilter = LabTier | "all";

const tierMatch = (m: CanonicalModel, tier: TierFilter) => tier === "all" || m.tier === tier;

export function releaseRadar(index: CatalogIndex, opts: { days: number; tier?: TierFilter }): CanonicalModel[] {
  const since = addDays(index.today, -opts.days);
  return index.models
    .filter((m) => !m.aliasOnly && m.releaseDate && m.releaseDate >= since && m.releaseDate <= index.today)
    .filter((m) => tierMatch(m, opts.tier ?? "frontier"))
    .sort(byNewest);
}

/** How far back a model can have shipped and still count as part of a lab's lineup. */
const LINEUP_DAYS = 540;

export function frontierLineup(index: CatalogIndex, perLab: number): { lab: Lab; models: CanonicalModel[] }[] {
  const since = addDays(index.today, -LINEUP_DAYS);
  return LABS.filter((l) => l.tier === "frontier").map((lab) => ({
    lab,
    models: index.models
      .filter(
        (m) =>
          m.labId === lab.id &&
          m.tier === "frontier" &&
          m.kind === "chat" &&
          !m.specialPurpose &&
          !m.aliasOnly &&
          !m.preview &&
          m.isCurrent &&
          !!m.releaseDate &&
          m.releaseDate >= since &&
          soldByLab(m),
      )
      .sort(byNewest)
      .slice(0, perLab),
  }));
}

/** One host's scheduled retirement of a model, on one day. */
export interface HostRetirement {
  host: string;
  date: string;
  /** The lab's own API. */
  byLab: boolean;
  /** Only these versions, variants or regions retire and the host keeps the rest; empty when no one of those sets them apart. */
  only?: string[];
  /** Everything retires except these versions, variants or regions. */
  except?: string[];
}

export interface RetiringItem {
  model: CanonicalModel;
  /** Earliest retirement date in the window. */
  date: string;
  daysLeft: number;
  /** Each host's retirements inside the window, earliest first. */
  hosts: HostRetirement[];
  successor?: CanonicalModel;
}

const PLAN_KINDS: HostKind[] = ["subscription", "local"];

const regionName = (r: string) => (r.startsWith("us-gov") ? "US government regions" : r);

/** What can tell the listings that retire from those that stay, tried in this order. */
const FACETS: [(l: Listing) => string | undefined, (value: string) => string][] = [
  [(l) => l.snapshot, (s) => s],
  [(l) => (l.fast ? "fast mode" : undefined), (s) => s],
  [(l) => l.variant, (s) => s],
  [(l) => l.deployment, (s) => s],
  [(l) => l.region, regionName],
];

/** Which part of a host's offer a retirement covers: all of it, only some, or all but some. */
function scope(gone: Listing[], kept: Listing[]): Pick<HostRetirement, "only" | "except"> {
  if (!kept.length) return {};
  // Every listing on this side has the facet, and no listing on the other side shares its value.
  const apart = (side: Listing[], other: Listing[], facet: (l: Listing) => string | undefined) => {
    const values = side.map(facet);
    return values.every(Boolean) && !other.some((l) => values.includes(facet(l)));
  };
  const names = (side: Listing[], [facet, name]: (typeof FACETS)[number]) => [...new Set(side.map((l) => name(facet(l)!)))];
  for (const f of FACETS) if (apart(gone, kept, f[0])) return { only: names(gone, f) };
  for (const f of FACETS) if (apart(kept, gone, f[0])) return { except: names(kept, f) };
  return { only: [] };
}

/** Every scheduled retirement of the model, one per host and day, earliest first. Fine-tuned copies don't count. */
export function hostRetirements(m: CanonicalModel, opts: { apiOnly?: boolean } = {}): HostRetirement[] {
  const byHost = new Map<string, Listing[]>();
  for (const l of m.listings) {
    if (l.fineTune || (opts.apiOnly && PLAN_KINDS.includes(l.host.kind))) continue;
    byHost.set(l.hostId, [...(byHost.get(l.hostId) ?? []), l]);
  }
  const out: HostRetirement[] = [];
  for (const ls of byHost.values()) {
    const days = [...new Set(ls.map(retiresOn).filter((d): d is string => !!d))].sort();
    for (const date of days) {
      const gone = ls.filter((l) => retiresOn(l) === date);
      const kept = ls.filter((l) => (retiresOn(l) ?? "9999") > date);
      out.push({ host: ls[0].host.name, date, byLab: isFirstParty(ls[0], m.labId), ...scope(gone, kept) });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.host.localeCompare(b.host));
}

/**
 * The retirement that heads a host's upcoming ones: the first that takes all of it, or all of it bar some regions;
 * failing that, the first of only a part. A version or variant going sooner doesn't decide when the model goes.
 */
export function headlineRetirement(upcoming: HostRetirement[]): HostRetirement | undefined {
  return upcoming.find((r) => !r.only) ?? upcoming[0];
}

/** "2024-08-06, 2024-11-20 only", "all but US government regions", or null when all of it goes. */
export function retirementScope(r: HostRetirement): string | null {
  if (r.only) return r.only.length ? `${r.only.join(", ")} only` : "some versions only";
  if (r.except) return `all but ${r.except.join(", ")}`;
  return null;
}

/** "OpenAI", "OpenAI (2024-05-13 only)", "Azure OpenAI (except US government regions)". */
export function retirementLabel(r: HostRetirement): string {
  if (r.only) return `${r.host} (${r.only.length ? r.only.join(", ") : "some versions"} only)`;
  if (r.except) return `${r.host} (except ${r.except.join(", ")})`;
  return r.host;
}

/** A replacement has to outlast the retirement by this long, or moving to it buys nothing. */
const REPLACEMENT_MARGIN_DAYS = 90;

/** The newest model in the line, unless that one is retired too: a retired model is history, not an upgrade. */
export function liveSuccessor(m: CanonicalModel, index: CatalogIndex): CanonicalModel | undefined {
  const next = m.successorSlug ? index.bySlug.get(m.successorSlug) : undefined;
  return next && !isRetired(next, index.today) ? next : undefined;
}

/** What to move to before `date`: the live successor, if no API drops it within the margin after. */
export function replacementFor(m: CanonicalModel, date: string, index: CatalogIndex): CanonicalModel | undefined {
  const next = liveSuccessor(m, index);
  const leaves = next && nextRetirement(next, index.today);
  return leaves && daysBetween(date, leaves.date) < REPLACEMENT_MARGIN_DAYS ? undefined : next;
}

export function retiring(
  index: CatalogIndex,
  opts: { fromDays: number; toDays: number; tier?: TierFilter; apiOnly?: boolean },
): RetiringItem[] {
  const from = addDays(index.today, opts.fromDays);
  const to = addDays(index.today, opts.toDays);
  const items: RetiringItem[] = [];
  for (const m of index.models) {
    if (!tierMatch(m, opts.tier ?? "all")) continue;
    const hosts = hostRetirements(m, { apiOnly: opts.apiOnly }).filter((r) => r.date >= from && r.date <= to);
    if (!hosts.length) continue;
    const date = hosts[0].date;
    items.push({
      model: m,
      date,
      daysLeft: daysBetween(index.today, date),
      hosts,
      successor: replacementFor(m, date, index),
    });
  }
  return items.sort((a, b) => (a.date === b.date ? byNewest(a.model, b.model) : a.date < b.date ? -1 : 1));
}

export interface NextRetirement {
  date: string;
  daysLeft: number;
  /** Hosts dropping it on that date, labelled as `retirementLabel` does. */
  hosts: string[];
  /** The lab's own API is one of them. */
  byLab: boolean;
}

/**
 * The next date an API (not a subscription plan or a local runtime) stops serving the model, or all of it bar
 * some regions. A single version or region retiring doesn't count.
 */
export function nextRetirement(m: CanonicalModel, today: string): NextRetirement | null {
  const due = hostRetirements(m, { apiOnly: true }).filter((r) => r.date >= today && !r.only);
  if (!due.length) return null;
  const date = due[0].date;
  const first = due.filter((r) => r.date === date);
  return {
    date,
    daysLeft: daysBetween(today, date),
    hosts: first.map(retirementLabel),
    byLab: first.some((r) => r.byLab),
  };
}

export type ModelSortKey = "newest" | "price" | "context" | "hosts" | "name";

export interface ModelFilter {
  tier?: TierFilter;
  lab?: string;
  kind?: ModelKind | "all";
  q?: string;
  sort?: ModelSortKey;
  includeRetired?: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s._/:-]+/g, "");

export function matchesQuery(m: CanonicalModel, q: string): boolean {
  const needle = norm(q);
  if (!needle) return true;
  return (
    norm(m.name).includes(needle) ||
    norm(m.slug).includes(needle) ||
    norm(m.labName).includes(needle) ||
    m.listings.some((l) => norm(l.apiModelId).includes(needle))
  );
}

const SORTS: Record<ModelSortKey, (a: CanonicalModel, b: CanonicalModel) => number> = {
  newest: byNewest,
  price: (a, b) => (a.reference.blended ?? Infinity) - (b.reference.blended ?? Infinity) || byNewest(a, b),
  context: (a, b) => b.contextWindow - a.contextWindow || byNewest(a, b),
  hosts: (a, b) => b.hostCount - a.hostCount || byNewest(a, b),
  name: (a, b) => a.name.localeCompare(b.name),
};

export function filterModels(index: CatalogIndex, f: ModelFilter): CanonicalModel[] {
  const tier = f.tier ?? (f.lab || f.q ? "all" : "frontier");
  const kind = f.kind ?? "chat";
  return index.models
    .filter((m) => tierMatch(m, tier))
    .filter((m) => kind === "all" || m.kind === kind)
    .filter((m) => !f.lab || m.labSlug === f.lab)
    .filter((m) => f.includeRetired || !isRetired(m, index.today))
    .filter((m) => (f.q ? matchesQuery(m, f.q) : !m.aliasOnly))
    .sort(SORTS[f.sort ?? "newest"]);
}

/** Compact rows for the ⌘K palette. */
export interface SearchRow {
  s: string; // slug
  l: string; // lab slug
  n: string; // name
  k: ModelKind;
  t: LabTier;
  r?: string; // release date
  a: string[]; // API ids (deduped)
}

export function searchRows(index: CatalogIndex): SearchRow[] {
  return [...index.models].sort(byNewest).map((m) => ({
    s: m.slug,
    l: m.labSlug,
    n: m.name,
    k: m.kind,
    t: m.tier,
    ...(m.releaseDate ? { r: m.releaseDate } : {}),
    a: [...new Set(m.listings.map((l) => l.apiModelId))].slice(0, 6),
  }));
}
