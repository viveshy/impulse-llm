/**
 * The /watchlist URL format: `w=model@host~pin,…`. A model on a host, optionally pinned to one of the host's
 * listings by the first 12 hex digits of its id (a uuid5 of the LiteLLM key, so it survives catalog rebuilds).
 */
export const MAX_WATCH = 40;

export interface WatchItem {
  /** Canonical model slug. */
  model: string;
  /** Host slug. */
  host: string;
  /** One listing on the host: a version, region or deployment. */
  pin?: string;
}

const ITEM = /^([a-z0-9][a-z0-9-]*)@([a-z0-9][a-z0-9-]*)(?:~([0-9a-f]{12}))?$/;

export const pinOf = (listingId: string) => listingId.replace(/-/g, "").slice(0, 12).toLowerCase();

export const watchKey = (i: WatchItem) => `${i.model}@${i.host}${i.pin ? `~${i.pin}` : ""}`;

/** In order, repeats collapsed, unreadable entries dropped, at most `MAX_WATCH`. */
export function parseWatchParam(raw: string | string[] | undefined): WatchItem[] {
  const out: WatchItem[] = [];
  const seen = new Set<string>();
  for (const part of (Array.isArray(raw) ? raw.join(",") : (raw ?? "")).split(",")) {
    const m = part.trim().toLowerCase().match(ITEM);
    if (!m) continue;
    const item: WatchItem = { model: m[1], host: m[2], ...(m[3] ? { pin: m[3] } : {}) };
    if (seen.has(watchKey(item))) continue;
    seen.add(watchKey(item));
    out.push(item);
    if (out.length === MAX_WATCH) break;
  }
  return out;
}

export const watchParam = (items: WatchItem[]) => items.map(watchKey).join(",");
