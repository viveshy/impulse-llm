/**
 * The watchlist: the models a team runs, each on its host, and what needs doing about them. An item is a model on
 * a host, or one listing of it (pinned): still listed or gone, retiring when and in which part, what to move to on
 * the same host, and the latest price move.
 */
import type { PriceChange } from "@/lib/domain/types";
import { pinOf, watchKey, type WatchItem } from "@/lib/watchlist";
import { listingMoves, type ListingMove } from "./changes";
import { hostRows, mainFirst, qualifiers } from "./detail";
import { isLive, isPriceOption, retiresOn } from "./group";
import type { HostKind } from "./hosts";
import { labFor } from "./labs";
import { lineAndVersion } from "./lineage";
import { displayName } from "./names";
import { NOTICE_PAGES } from "./notices";
import {
  byNewest,
  daysBetween,
  frontierLineup,
  hostRetirements,
  liveSuccessor,
  replacementFor,
  retiring,
  type HostRetirement,
} from "./select";
import type { CanonicalModel, CatalogIndex, Listing } from "./types";

export type WatchState = "model-gone" | "host-gone" | "pin-gone" | "retired" | "retiring" | "not-before" | "ok";

/** Retirements this close need acting on now. */
export const ACT_WITHIN_DAYS = 90;

export interface WatchSuccessor {
  model: CanonicalModel;
  /** Its listing on the watched host, in the same region where there is one; absent when the host doesn't serve it. */
  listing?: Listing;
  /** Blended price against the watched listing's; null when either isn't a per-token price. */
  delta: number | null;
}

export interface WatchRow {
  item: WatchItem;
  key: string;
  name: string;
  model?: CanonicalModel;
  hostSlug: string;
  hostName: string;
  /** The pinned listing, or the host's main one. */
  listing?: Listing;
  /** How many listings the host has of the model (fine-tunes aside). */
  hostListings: number;
  state: WatchState;
  /** The host's scheduled retirements from today on, earliest first; a pinned row has at most one. */
  retirements: HostRetirement[];
  /** Days until the first of them. */
  daysLeft?: number;
  retiredOn?: string;
  /** The host only promises the model until this day ("not sooner than"). */
  notBefore?: string;
  /** What to move to when it retires or is gone; otherwise a newer model in its line. */
  successor?: WatchSuccessor;
  /** The latest move in the price history, on the listing it happened to. */
  priceMove?: ListingMove & { listing: Listing };
  /** The host's own retirement notice. */
  noticeUrl?: string;
}

const NOT_A_PRICE: HostKind[] = ["subscription", "local"];

const RANK: Record<WatchState, number> = {
  "model-gone": 0,
  "host-gone": 0,
  "pin-gone": 0,
  retired: 1,
  retiring: 2,
  "not-before": 3,
  ok: 3,
};

const versus = (a: Listing | undefined, b: Listing | undefined) =>
  a && b && isPriceOption(a) && isPriceOption(b) && a.blended && b.blended ? a.blended / b.blended - 1 : null;

/** The newest current model in the line a slug names: for a model the catalog no longer lists. */
function lineHead(slug: string, index: CatalogIndex): CanonicalModel | undefined {
  const { line, version } = lineAndVersion(slug);
  const labId = labFor(slug);
  if (!version.length || !labId) return undefined;
  return index.models
    .filter((m) => m.labId === labId && m.line === line && m.version.length > 0 && m.isCurrent && !m.aliasOnly)
    .sort(byNewest)[0];
}

function successorOn(next: CanonicalModel | undefined, hostSlug: string, watched: Listing | undefined): WatchSuccessor | undefined {
  if (!next) return undefined;
  const here = next.listings.filter((l) => l.host.slug === hostSlug && !l.fineTune && !l.commitment);
  const sameRegion = watched?.region ? here.filter((l) => l.region === watched.region) : [];
  const listing = [...(sameRegion.length ? sameRegion : here)].sort(mainFirst)[0];
  return { model: next, ...(listing ? { listing } : {}), delta: versus(listing, watched) };
}

function watchRow(index: CatalogIndex, item: WatchItem, moves: Map<string, ListingMove>): WatchRow {
  const today = index.today;
  const model = index.bySlug.get(item.model);
  const here = model?.listings.filter((l) => l.host.slug === item.host && !l.fineTune) ?? [];
  const base = {
    item,
    key: watchKey(item),
    name: model?.name ?? displayName(item.model),
    hostSlug: item.host,
    hostName: index.hostBySlug.get(item.host)?.name ?? here[0]?.host.name ?? item.host,
    hostListings: here.length,
    retirements: [],
    ...(NOTICE_PAGES.some((n) => n.host === item.host) ? { noticeUrl: NOTICE_PAGES.find((n) => n.host === item.host)!.url } : {}),
  };
  if (!model) {
    return { ...base, state: "model-gone", successor: successorOn(lineHead(item.model, index), item.host, undefined) };
  }

  const pinned = item.pin ? here.find((l) => pinOf(l.id) === item.pin) : undefined;
  if (!here.length || (item.pin && !pinned)) {
    return {
      ...base,
      model,
      state: here.length ? "pin-gone" : "host-gone",
      successor: successorOn(replacementFor(model, today, index), item.host, undefined),
    };
  }

  const scope = pinned ? [pinned] : here;
  const listing = pinned ?? [...here].sort(mainFirst)[0];
  const retired = scope.every((l) => !isLive(l, today));
  const upcoming = retired ? [] : hostRetirements({ ...model, listings: scope }).filter((r) => r.date >= today);
  const notBefore =
    listing.notBefore && listing.deprecationDate && listing.deprecationDate >= today ? listing.deprecationDate : undefined;
  const state: WatchState = retired ? "retired" : upcoming.length ? "retiring" : notBefore ? "not-before" : "ok";

  const next =
    state === "retired"
      ? replacementFor(model, today, index)
      : state === "retiring"
        ? replacementFor(model, upcoming[0].date, index)
        : liveSuccessor(model, index);
  const moved = scope.filter((l) => moves.has(l.id) && !NOT_A_PRICE.includes(l.host.kind)).sort(mainFirst)[0];
  const retiredOn = scope.map(retiresOn).filter((d): d is string => !!d).sort().at(-1);

  return {
    ...base,
    model,
    listing,
    state,
    retirements: upcoming,
    ...(upcoming.length ? { daysLeft: daysBetween(today, upcoming[0].date) } : {}),
    ...(retired && retiredOn ? { retiredOn } : {}),
    ...(state === "not-before" ? { notBefore } : {}),
    successor: successorOn(next, item.host, listing),
    ...(moved ? { priceMove: { ...moves.get(moved.id)!, listing: moved } } : {}),
  };
}

/** One row per item, what needs action first: gone, retired, then the soonest retirement. */
export function watchRows(index: CatalogIndex, items: WatchItem[], changes: PriceChange[] = []): WatchRow[] {
  const moves = listingMoves(changes);
  const soonest = (r: WatchRow) => (r.state === "retiring" ? r.daysLeft! : 0);
  return items
    .map((item) => watchRow(index, item, moves))
    .sort((a, b) => RANK[a.state] - RANK[b.state] || soonest(a) - soonest(b));
}

export interface WatchSummary {
  total: number;
  /** Gone, retired, or retiring within `ACT_WITHIN_DAYS`. */
  act: number;
  /** Retiring later than that. */
  later: number;
  /** Nothing scheduled, but a newer model in the line is out. */
  newer: number;
  /** A price move in the history window. */
  moved: number;
}

export function watchSummary(rows: WatchRow[]): WatchSummary {
  const retiringWithin = (r: WatchRow, within: boolean) =>
    r.state === "retiring" && r.daysLeft! <= ACT_WITHIN_DAYS === within;
  return {
    total: rows.length,
    act: rows.filter((r) => RANK[r.state] <= RANK.retired || retiringWithin(r, true)).length,
    later: rows.filter((r) => retiringWithin(r, false)).length,
    newer: rows.filter((r) => (r.state === "ok" || r.state === "not-before") && r.successor).length,
    moved: rows.filter((r) => r.priceMove).length,
  };
}

export interface WatchOption {
  host: { slug: string; name: string; kind: HostKind };
  /** The host's main listing first, then its regions, versions and deployments. */
  listings: { pin: string; apiModelId: string; label: string; retires?: string }[];
}

/** Where a model can be watched: every host that serves it, the lab's own first, fine-tuned copies left out. */
export function watchOptions(m: CanonicalModel, today: string): WatchOption[] {
  return hostRows(m)
    .map(({ listing, others }) => ({
      host: { slug: listing.host.slug, name: listing.host.name, kind: listing.host.kind },
      listings: [listing, ...others]
        .filter((l) => !l.fineTune)
        .map((l) => {
          const day = retiresOn(l);
          return {
            pin: pinOf(l.id),
            apiModelId: l.apiModelId,
            label: qualifiers(l).join(" · "),
            ...(day && day >= today ? { retires: day } : {}),
          };
        }),
    }))
    .filter((o) => o.listings.length);
}

/** Where an example list shows each frontier lab's newest model: on the cloud most teams buy it through. */
const EXAMPLE_CLOUD: Record<string, string> = {
  anthropic: "amazon-bedrock",
  google: "vertex-ai",
  openai: "azure-openai",
  xai: "azure-ai-foundry",
};

/** A list to try the page with: the next whole retirements at three frontier labs, and the newest models on clouds. */
export function exampleWatchlist(index: CatalogIndex): WatchItem[] {
  const items: WatchItem[] = [];
  const add = (m: CanonicalModel, host: string | undefined) => {
    if (!host || items.length >= 6 || !m.listings.some((l) => l.host.slug === host)) return;
    if (!items.some((i) => i.model === m.slug && i.host === host)) items.push({ model: m.slug, host });
  };
  const labs = new Set<string>();
  for (const it of retiring(index, { fromDays: 0, toDays: 365, tier: "frontier", apiOnly: true })) {
    const whole = it.hosts.find((h) => !h.only);
    if (!whole || it.model.specialPurpose || labs.has(it.model.labSlug)) continue;
    labs.add(it.model.labSlug);
    add(it.model, it.model.listings.find((l) => l.host.name === whole.host)?.host.slug);
    if (labs.size === 3) break;
  }
  for (const { lab, models } of frontierLineup(index, 1)) if (models[0]) add(models[0], EXAMPLE_CLOUD[lab.id]);
  return items;
}
