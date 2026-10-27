/**
 * Builds the canonical catalog: every API row becomes a Listing, listings with the same
 * key become one CanonicalModel, and lineage links each model to the newest in its line.
 */
import { CAPABILITY_KEYS, type Model, type Provider } from "@/lib/domain/types";
import { wholeSentences } from "@/lib/utils/format";
import { hostInfo, type HostInfo, type HostKind } from "./hosts";
import { parseListingName, qualifiedName, routeInfo } from "./keys";
import { labById, labFor, type LabId } from "./labs";
import { assignLineage, lineAndVersion } from "./lineage";
import { displayName } from "./names";
import { applyNotice } from "./notices";
import type { CanonicalModel, CatalogIndex, HostSummary, Listing, ModelKind } from "./types";

const KIND_BY_MODE: Record<string, ModelKind> = {
  chat: "chat",
  responses: "chat",
  completion: "chat",
  image_generation: "image",
  image_edit: "image",
  video_generation: "video",
  audio_speech: "speech",
  audio_transcription: "transcription",
  realtime: "realtime",
  embedding: "embedding",
  rerank: "rerank",
  moderation: "moderation",
  search: "search",
  ocr: "ocr",
};

const SPECIAL =
  /(^|-)(search|audio|realtime|tts|transcribe|image|embedding|moderation|deep-research|computer-use|cyber|live|robotics|translate|voice|imagine|customtools|safeguard|guard|ocr|think|exp|experimental)(-|$)/;
const PREVIEW = /(^|-)(preview|beta|exp|experimental)(-|$)/;
/** "Bedrock chat model." — the sync's filler when no real description exists. */
const FILLER = /^[\w .()/-]{0,60} model\.$/;

const NOT_A_HOST: HostKind[] = ["subscription", "local"];

/** 3:1 input to output. A $0 output price means none is listed (embeddings), the same as null. */
export function blended(input: number, output: number | null): number | null {
  if (input <= 0 && (output ?? 0) <= 0) return null;
  return output === null || output <= 0 ? input : (3 * input + output) / 4;
}

export function isFirstParty(l: Listing, labId: LabId | null): boolean {
  return !!labId && l.host.labId === labId;
}

/** The model is sold by its own lab (or the lab's own cloud) at a real per-token price. */
export function soldByLab(m: CanonicalModel): boolean {
  return m.listings.some((l) => isFirstParty(l, m.labId) && isPriceOption(l));
}

/** A listing whose price is a real per-token offer. */
export function isPriceOption(l: Listing): boolean {
  return l.priced && !l.fineTune && !l.commitment && !NOT_A_HOST.includes(l.host.kind);
}

/** The day the host has scheduled the listing to retire; an earliest-possible date isn't one. */
export function retiresOn(l: Listing): string | undefined {
  return l.notBefore ? undefined : l.deprecationDate;
}

/** Still served: not retired, and its retirement day, if any, is still to come. */
export function isLive(l: Listing, today: string): boolean {
  return l.status !== "deprecated" && (retiresOn(l) ?? "9999") > today;
}

/** The cheapest real per-token offer for a model (blended 3:1), if any; on a tie, the preferred host. */
export function cheapestListing(m: CanonicalModel): Listing | undefined {
  return byPreference(m.listings.filter(isPriceOption), m.labId).sort((a, b) => a.blended! - b.blended!)[0];
}

export function toListing(m: Model, provider: Provider | undefined): Listing {
  const host: HostInfo = provider
    ? hostInfo(provider.name, provider.category)
    : { slug: "unknown", name: "Unknown host", kind: "cloud", known: false };
  const parsed = parseListingName(qualifiedName(m.name, m.route, m.litellmProvider), { hostName: provider?.name });
  const route = routeInfo(m.route, m.litellmProvider);
  const out = m.pricing.outputPerMTok;
  const priced = m.pricing.inputPerMTok > 0 || (out ?? 0) > 0;
  return applyNotice(host.slug, m.name, {
    id: m.id,
    hostId: m.providerId,
    host,
    apiModelId: m.name,
    key: parsed.key,
    snapshot: parsed.snapshot,
    region: parsed.region ?? route.region,
    deployment: route.deployment,
    variant: route.variant,
    vendor: parsed.vendor,
    fast: parsed.fast,
    fineTune: parsed.fineTune,
    commitment: route.commitment,
    alias: parsed.alias,
    mode: m.mode ?? "chat",
    kind: KIND_BY_MODE[m.mode ?? "chat"] ?? "other",
    status: m.deprecation,
    deprecationDate: m.deprecationDate,
    releaseDate: m.releaseDate || undefined,
    pricing: m.pricing,
    priced,
    blended: priced ? blended(m.pricing.inputPerMTok, out) : null,
    contextWindow: m.context.contextWindow,
    maxOutputTokens: m.context.maxOutputTokens,
    capabilities: CAPABILITY_KEYS.filter((k) => m.capabilities[k]),
    features: m.features ?? [],
    reasoningEfforts: m.reasoningEfforts ?? [],
    modalities: m.modalities,
    description: m.description,
    openWeights: m.openness.isOpenWeights,
    license: m.openness.license,
    minVramGb: m.openness.minVramGb,
    runtimes: m.openness.runtimes ?? [],
    sourceUrl: m.sourceUrl,
    litellmProvider: m.litellmProvider,
  });
}

const KIND_ORDER: HostKind[] = ["first-party", "cloud", "inference", "gateway", "local", "subscription"];

export function pickReference(listings: Listing[], labId: LabId | null): Listing {
  const pool = listings.filter((l) => !l.fineTune && !l.commitment && l.host.kind !== "subscription");
  return byPreference(pool.length ? pool : listings, labId)[0];
}

/**
 * Lexicographic preference: the lab's own API, priced, a host we know, global, current
 * alias, standard speed; then the cheapest.
 */
export function byPreference(listings: Listing[], labId: LabId | null): Listing[] {
  const rank = (l: Listing): (number | string)[] => [
    isFirstParty(l, labId) ? 0 : 1,
    l.priced ? 0 : 1,
    l.host.known ? 0 : 1,
    l.region || l.deployment || l.variant ? 1 : 0,
    l.snapshot ? 1 : 0,
    l.fast ? 1 : 0,
    l.alias ? 1 : 0,
    l.blended ?? Number.POSITIVE_INFINITY,
    KIND_ORDER.indexOf(l.host.kind),
    // newest snapshot first among equals
    l.snapshot ? invert(l.snapshot) : "",
    l.apiModelId.length,
  ];
  return [...listings].sort((a, b) => compareRanks(rank(a), rank(b)));
}

function invert(s: string): string {
  return [...s].map((c) => (/\d/.test(c) ? String(9 - Number(c)) : c)).join("");
}

function compareRanks(a: (number | string)[], b: (number | string)[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [v, c] of counts) if (c > n) [best, n] = [v, c];
  return best;
}

function bestDescription(listings: Listing[], reference: Listing): string {
  if (reference.description && !FILLER.test(reference.description)) return wholeSentences(reference.description);
  const real = listings.map((l) => l.description).filter((d) => d && !FILLER.test(d));
  return wholeSentences(real.sort((a, b) => b.length - a.length)[0] ?? "");
}

function releaseDateOf(listings: Listing[]): string | undefined {
  const dates = listings
    .flatMap((l) => [l.releaseDate, l.snapshot && /^\d{4}-\d\d-\d\d$/.test(l.snapshot) ? l.snapshot : undefined])
    .filter((d): d is string => !!d && /^\d{4}-\d\d-\d\d/.test(d))
    .map((d) => d.slice(0, 10))
    .sort();
  return dates[0];
}

function toCanonical(key: string, listings: Listing[], providerNames: Map<string, string>): CanonicalModel {
  const labId =
    mostCommon(listings.map((l) => labFor(key, l.vendor, providerNames.get(l.hostId))).filter((x): x is string => !!x)) ??
    null;
  const lab = labById(labId);
  const reference = pickReference(listings, labId);
  const openWeights = listings.some((l) => l.openWeights);
  const { line, version } = lineAndVersion(key);
  const hostIds = new Set(listings.filter((l) => !NOT_A_HOST.includes(l.host.kind) && !l.fineTune).map((l) => l.hostId));

  return {
    slug: key,
    labId,
    labSlug: labId ?? "other",
    labName: lab?.name ?? "Independent",
    name: displayName(key),
    line,
    version,
    tier: openWeights ? "open" : lab?.tier === "frontier" ? "frontier" : "other",
    openWeights,
    kind: reference.kind,
    mode: reference.mode,
    releaseDate: releaseDateOf(listings),
    description: bestDescription(listings, reference),
    reference,
    listings,
    hostCount: hostIds.size,
    capabilities: reference.capabilities,
    features: reference.features,
    reasoningEfforts: reference.reasoningEfforts,
    modalities: reference.modalities,
    contextWindow: reference.contextWindow || Math.max(0, ...listings.map((l) => l.contextWindow)),
    maxOutputTokens: reference.maxOutputTokens || Math.max(0, ...listings.map((l) => l.maxOutputTokens)),
    status: reference.status,
    deprecationDate: retiresOn(reference),
    preview: PREVIEW.test(key),
    aliasOnly: version.length === 0 && listings.every((l) => l.alias),
    specialPurpose: reference.kind !== "chat" || SPECIAL.test(key),
    predecessorSlugs: [],
    isCurrent: true,
  };
}

export function buildIndex(
  models: Model[],
  providers: Provider[],
  opts: { now: Date; generatedAt?: string },
): CatalogIndex {
  const today = opts.now.toISOString().slice(0, 10);
  const providerById = new Map(providers.map((p) => [p.id, p]));
  const providerNames = new Map(providers.map((p) => [p.id, p.name]));

  const groups = new Map<string, Listing[]>();
  for (const m of models) {
    const listing = toListing(m, providerById.get(m.providerId));
    const list = groups.get(listing.key) ?? [];
    list.push(listing);
    groups.set(listing.key, list);
  }

  const canon = [...groups].map(([key, listings]) => toCanonical(key, listings, providerNames));
  assignLineage(canon, today);

  const bySlug = new Map(canon.map((m) => [m.slug, m]));
  const byListingId = new Map<string, CanonicalModel>();
  for (const m of canon) for (const l of m.listings) byListingId.set(l.id, m);

  // A moving `-latest` alias has no page of its own, so it isn't one of the host's models either.
  const hostStats = new Map<string, { slugs: Set<string>; frontier: Set<string> }>();
  for (const m of canon) {
    if (m.aliasOnly) continue;
    for (const l of m.listings) {
      const s = hostStats.get(l.hostId) ?? { slugs: new Set(), frontier: new Set() };
      s.slugs.add(m.slug);
      if (m.tier === "frontier") s.frontier.add(m.slug);
      hostStats.set(l.hostId, s);
    }
  }
  const hosts: HostSummary[] = providers
    .map((p) => {
      const info = hostInfo(p.name, p.category);
      const s = hostStats.get(p.id);
      return {
        id: p.id,
        slug: info.slug,
        name: info.name,
        kind: info.kind,
        modelCount: s?.slugs.size ?? 0,
        frontierCount: s?.frontier.size ?? 0,
      };
    })
    .filter((h) => h.modelCount > 0)
    .sort((a, b) => b.frontierCount - a.frontierCount || b.modelCount - a.modelCount || a.name.localeCompare(b.name));

  return {
    models: canon,
    bySlug,
    byListingId,
    hosts,
    hostBySlug: new Map(hosts.map((h) => [h.slug, h])),
    generatedAt: opts.generatedAt,
    today,
  };
}
