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
import { noticeFor } from "./notices";
import {
  addDays,
  byNewest,
  daysBetween,
  frontierLineup,
  headlineRetirement,
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

/** A retirement stays on the row, for the calendar, this long after its day. */
const RECENT_DAYS = 90;

export interface WatchSuccessor {
  model: CanonicalModel;
  /** Its live listing on the watched host, in the same region where there is one; absent when the host doesn't serve it. */
  listing?: Listing;
  /** The host listed it but has retired it since. */
  retiredHere?: true;
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
  /** The catalog has this host, so it has a page. */
  hostKnown: boolean;
  /** For a host that doesn't list the model: how many other hosts serve it now. */
  otherHosts?: number;
  /** The pinned listing, or the host's main one. */
  listing?: Listing;
  /** How many listings the host has of the model (fine-tunes aside). */
  hostListings: number;
  state: WatchState;
  /** The host's scheduled retirements still to come, earliest first; a pinned row has at most one. */
  retirements: HostRetirement[];
  /** Its retirements of the last `RECENT_DAYS`, today's included: the calendar keeps them. */
  recent: HostRetirement[];
  /** Only part of the host's offer is scheduled to retire (a version, variant or region); the rest stays. */
  partly?: true;
  /** Days until the retirement that heads them (`headlineRetirement`). */
  daysLeft?: number;
  retiredOn?: string;
  /** Retired bar these versions or regions, which the host still serves. */
  except?: string[];
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

function successorOn(
  next: CanonicalModel | undefined,
  hostSlug: string,
  watched: Listing | undefined,
  today: string,
): WatchSuccessor | undefined {
  if (!next) return undefined;
  const listed = next.listings.filter((l) => l.host.slug === hostSlug && !l.fineTune && !l.commitment);
  const here = listed.filter((l) => isLive(l, today));
  const sameRegion = watched?.region ? here.filter((l) => l.region === watched.region) : [];
  const listing = [...(sameRegion.length ? sameRegion : here)].sort(mainFirst)[0];
  return {
    model: next,
    ...(listing ? { listing } : listed.length ? { retiredHere: true as const } : {}),
    delta: versus(listing, watched),
  };
}

function watchRow(index: CatalogIndex, item: WatchItem, moves: Map<string, ListingMove>): WatchRow {
  const today = index.today;
  const model = index.bySlug.get(item.model);
  const here = model?.listings.filter((l) => l.host.slug === item.host && !l.fineTune) ?? [];
  const host = index.hostBySlug.get(item.host);
  const noticeUrl = noticeFor(item.host, model?.labId ?? labFor(item.model), here.map((l) => l.apiModelId));
  const base = {
    item,
    key: watchKey(item),
    name: model?.name ?? displayName(item.model),
    hostSlug: item.host,
    hostName: host?.name ?? item.host,
    hostKnown: !!host,
    hostListings: here.length,
    retirements: [],
    recent: [],
    ...(noticeUrl ? { noticeUrl } : {}),
  };
  if (!model) {
    return { ...base, state: "model-gone", successor: successorOn(lineHead(item.model, index), item.host, undefined, today) };
  }

  const pinned = item.pin ? here.find((l) => pinOf(l.id) === item.pin) : undefined;
  if (!here.length || (item.pin && !pinned)) {
    const others = new Set(
      model.listings.filter((l) => l.host.slug !== item.host && !l.fineTune && isLive(l, today)).map((l) => l.host.slug),
    );
    return {
      ...base,
      model,
      state: here.length ? "pin-gone" : "host-gone",
      ...(here.length ? {} : { otherHosts: others.size }),
      successor: successorOn(replacementFor(model, today, index), item.host, undefined, today),
    };
  }

  const scope = pinned ? [pinned] : here;
  const listing = pinned ?? [...here].sort(mainFirst)[0];
  const all = hostRetirements({ ...model, listings: scope });
  // A listing is gone on its retirement day.
  const upcoming = all.filter((r) => r.date > today);
  const past = all.filter((r) => r.date <= today);
  const gone = scope.every((l) => !isLive(l, today));
  // The host has retired all of it bar some versions or regions: retired, though those stay.
  const cut = gone ? undefined : past.filter((r) => !r.only).at(-1);
  const retired = gone || !!cut;
  const headline = retired ? undefined : headlineRetirement(upcoming);
  const notBefore =
    listing.notBefore && listing.deprecationDate && listing.deprecationDate >= today ? listing.deprecationDate : undefined;
  const state: WatchState = retired ? "retired" : headline ? "retiring" : notBefore ? "not-before" : "ok";
  const partly = !!headline?.only;

  const next =
    state === "retired"
      ? replacementFor(model, today, index)
      : state === "retiring" && !partly
        ? replacementFor(model, headline!.date, index)
        : liveSuccessor(model, index);
  const moved = scope.filter((l) => moves.has(l.id) && !NOT_A_PRICE.includes(l.host.kind)).sort(mainFirst)[0];
  const retiredOn = cut ? cut.date : scope.map(retiresOn).filter((d): d is string => !!d).sort().at(-1);
  const since = addDays(today, -RECENT_DAYS);

  return {
    ...base,
    model,
    listing,
    state,
    retirements: upcoming,
    recent: past.filter((r) => r.date >= since),
    ...(partly ? { partly: true as const } : {}),
    ...(headline ? { daysLeft: daysBetween(today, headline.date) } : {}),
    ...(retired && retiredOn ? { retiredOn } : {}),
    ...(cut?.except ? { except: cut.except } : {}),
    ...(state === "not-before" ? { notBefore } : {}),
    successor: successorOn(next, item.host, listing, today),
    ...(moved ? { priceMove: { ...moves.get(moved.id)!, listing: moved } } : {}),
  };
}

/** The row calls for moving off the model: it, the host's listing or the pinned version is gone, or the host retires all of it. */
export const isMoving = (r: WatchRow) => r.state !== "ok" && r.state !== "not-before" && !r.partly;

/** One row per item, what needs action first: gone, retired, then the soonest retirement. */
export function watchRows(index: CatalogIndex, items: WatchItem[], changes: PriceChange[] = []): WatchRow[] {
  const moves = listingMoves(changes);
  // A part retiring comes after every whole retirement, before nothing retiring at all.
  const rank = (r: WatchRow) => (r.partly ? RANK.retiring + 0.5 : RANK[r.state]);
  const soonest = (r: WatchRow) => (r.state === "retiring" ? r.daysLeft! : 0);
  return items
    .map((item) => watchRow(index, item, moves))
    .sort((a, b) => rank(a) - rank(b) || soonest(a) - soonest(b));
}

export interface WatchSummary {
  total: number;
  /** Gone, retired, or retiring as a whole within `ACT_WITHIN_DAYS`. */
  act: number;
  /** Retiring as a whole later than that. */
  later: number;
  /** Nothing to move off yet, but a newer model in the line is out. */
  newer: number;
  /** A price move in the history window. */
  moved: number;
}

export function watchSummary(rows: WatchRow[]): WatchSummary {
  const retiringWithin = (r: WatchRow, within: boolean) =>
    r.state === "retiring" && !r.partly && r.daysLeft! <= ACT_WITHIN_DAYS === within;
  return {
    total: rows.length,
    act: rows.filter((r) => RANK[r.state] <= RANK.retired || retiringWithin(r, true)).length,
    later: rows.filter((r) => retiringWithin(r, false)).length,
    newer: rows.filter((r) => !isMoving(r) && r.successor).length,
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
