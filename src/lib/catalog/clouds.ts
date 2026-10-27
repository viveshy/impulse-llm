/**
 * The frontier models a team can buy through the cloud it already has a contract with: which of the frontier labs'
 * current models each cloud lists, at what price against the lab's own API, in which regions, and what it retires
 * next. Only clouds whose lists in the catalog match their own docs are covered.
 */
import { cloudById, CLOUDS, ZONES, zoneOf, type Cloud, type CloudId, type ZoneId } from "@/lib/clouds";
import { isFirstParty, isLive, isPriceOption } from "./group";
import { LABS, type Lab, type LabId } from "./labs";
import { addDays, byNewest, frontierLineup, headlineRetirement, hostRetirements, type HostRetirement } from "./select";
import type { CanonicalModel, CatalogIndex, HostSummary, Listing } from "./types";

const ZONE_IDS = ZONES.map((z) => z.id);

/**
 * How recent a model outside the lineup must be to count as one the cloud still serves. The catalog keeps old and
 * undated listings clouds have quietly dropped (Claude 1 on Bedrock), so those are left to the host's own page.
 */
const OTHER_DAYS = 730;

export interface CloudOffer {
  model: CanonicalModel;
  /** Its live listings on the cloud, in the chosen zone if there is one; fine-tunes and commitments aside. */
  listings: Listing[];
  /** The cheapest per-token listing among them. */
  best?: Listing;
  /** `best` against the lab's own API, as a ratio minus one; null when there is no per-token price to compare. */
  vsLab: number | null;
  /** The zones it is listed in on this cloud, whichever zone is chosen. */
  zones: ZoneId[];
  /** The cloud's next retirement of all of it (or all of it bar some regions); failing that, of a part of it. */
  retires?: HostRetirement;
  /** A retirement of only a part of it, before `retires`. */
  sooner?: HostRetirement;
}

/** It retires as a whole, not just in part, on or before `until`. */
export const retiresBy = (o: CloudOffer, until: string) => !!o.retires && !o.retires.only && o.retires.date <= until;

function offerOn(m: CanonicalModel, cloud: Cloud, today: string, zone?: ZoneId): CloudOffer | null {
  const all = m.listings.filter((l) => cloud.hosts.includes(l.host.slug) && !l.fineTune && !l.commitment && isLive(l, today));
  const listings = zone ? all.filter((l) => zoneOf(l.region) === zone) : all;
  if (!listings.length) return null;
  const best = listings.filter(isPriceOption).sort((a, b) => a.blended! - b.blended!)[0];
  const lab = m.reference;
  const vsLab =
    best && isFirstParty(lab, m.labId) && isPriceOption(lab) && lab.blended ? best.blended! / lab.blended - 1 : null;
  const upcoming = hostRetirements({ ...m, listings }).filter((r) => r.date > today);
  const retires = headlineRetirement(upcoming);
  const sooner = retires && upcoming[0] !== retires ? upcoming[0] : undefined;
  return {
    model: m,
    listings,
    ...(best ? { best } : {}),
    vsLab,
    zones: ZONE_IDS.filter((z) => all.some((l) => zoneOf(l.region) === z)),
    ...(retires ? { retires } : {}),
    ...(sooner ? { sooner } : {}),
  };
}

const offersOn = (models: CanonicalModel[], cloud: Cloud, today: string, zone?: ZoneId) =>
  models.flatMap((m) => offerOn(m, cloud, today, zone) ?? []);

export interface CloudService {
  host: HostSummary;
  /** It lists the frontier models it sells per region, so the zone filter applies to it. */
  regions: boolean;
}

export interface MissingModel {
  model: CanonicalModel;
  /**
   * In a zone, the cloud lists it elsewhere: "outside" the zone when every listing of it is in a zone we know,
   * "unplaced" when one names no region, or one `zoneOf` can't place (a spelling such as "westeurope"), so it may be
   * sold in the zone all the same.
   */
  onCloud?: "outside" | "unplaced";
  /** The other clouds that list it, in any region. */
  elsewhere: CloudId[];
}

export interface CloudPage {
  cloud: Cloud;
  services: CloudService[];
  /** The zones its listings are in, for the filter; none when it lists no regions. */
  zones: ZoneId[];
  /** The chosen zone, when the cloud has listings in it. */
  zone?: ZoneId;
  /** The frontier labs' current lineup models it lists, lab by lab. */
  lineup: CloudOffer[];
  /** The lineup models it doesn't list (in the zone). */
  missing: MissingModel[];
  /** Other frontier chat models from the last two years it still serves: older versions, previews, models their lab has retired. */
  other: CloudOffer[];
}

const lineupByLab = (index: CatalogIndex) =>
  frontierLineup(index, Number.POSITIVE_INFINITY).filter((g) => g.models.length > 0);

export function cloudPage(index: CatalogIndex, id: string, zoneParam?: string): CloudPage | null {
  const cloud = cloudById(id);
  if (!cloud) return null;
  const today = index.today;
  const lineup = lineupByLab(index).flatMap((g) => g.models);
  const inLineup = new Set(lineup.map((m) => m.slug));
  const since = addDays(today, -OTHER_DAYS);
  const others = index.models
    .filter(
      (m) =>
        m.tier === "frontier" &&
        m.kind === "chat" &&
        !m.specialPurpose &&
        !m.aliasOnly &&
        !inLineup.has(m.slug) &&
        !!m.releaseDate &&
        m.releaseDate >= since,
    )
    .sort(byNewest);

  const everywhere = offersOn([...lineup, ...others], cloud, today);
  const zones = ZONE_IDS.filter((z) => everywhere.some((o) => o.zones.includes(z)));
  const zone = zones.find((z) => z === zoneParam);
  const carried = offersOn(lineup, cloud, today, zone);
  const listed = new Set(carried.map((o) => o.model.slug));

  return {
    cloud,
    services: cloud.hosts.flatMap((slug) => {
      const host = index.hostBySlug.get(slug);
      const regions = everywhere.some((o) => o.listings.some((l) => l.host.slug === slug && zoneOf(l.region)));
      return host ? [{ host, regions }] : [];
    }),
    zones,
    ...(zone ? { zone } : {}),
    lineup: carried,
    missing: lineup
      .filter((m) => !listed.has(m.slug))
      .map((m) => {
        const there = zone && offerOn(m, cloud, today);
        return {
          model: m,
          ...(there ? { onCloud: there.listings.every((l) => zoneOf(l.region)) ? ("outside" as const) : ("unplaced" as const) } : {}),
          elsewhere: CLOUDS.filter((c) => c.id !== cloud.id && offerOn(m, c, today)).map((c) => c.id),
        };
      }),
    other: offersOn(others, cloud, today, zone),
  };
}

export interface CloudSummary {
  cloud: Cloud;
  services: CloudService[];
  /** How many lineup models it lists. */
  carried: number;
  /** The labs whose lineup models it lists, in the usual lab order. */
  labs: LabId[];
  /** Frontier models on it that it retires as a whole in the next 12 months. */
  retiring: number;
  zones: ZoneId[];
}

export interface CloudOverview {
  clouds: CloudSummary[];
  lineupSize: number;
  /** The lineup lab by lab, each model with its offer on each cloud: null where the cloud doesn't list it. */
  rows: { lab: Lab; models: { model: CanonicalModel; cells: Partial<Record<CloudId, CloudOffer | null>> }[] }[];
}

export function cloudOverview(index: CatalogIndex): CloudOverview {
  const pages = CLOUDS.map((c) => cloudPage(index, c.id)!).filter((p) => p.services.length > 0);
  const groups = lineupByLab(index);
  const yearOut = addDays(index.today, 365);
  return {
    clouds: pages.map((p) => ({
      cloud: p.cloud,
      services: p.services,
      carried: p.lineup.length,
      labs: LABS.map((l) => l.id).filter((id) => p.lineup.some((o) => o.model.labId === id)),
      retiring: [...p.lineup, ...p.other].filter((o) => retiresBy(o, yearOut)).length,
      zones: p.zones,
    })),
    lineupSize: groups.reduce((n, g) => n + g.models.length, 0),
    rows: groups.map(({ lab, models }) => ({
      lab,
      models: models.map((model) => ({
        model,
        cells: Object.fromEntries(pages.map((p) => [p.cloud.id, p.lineup.find((o) => o.model.slug === model.slug) ?? null])),
      })),
    })),
  };
}
