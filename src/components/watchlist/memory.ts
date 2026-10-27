import { parseWatchParam, watchParam, type WatchItem } from "@/lib/watchlist";

/**
 * The list this browser remembers: the last one edited here, by adding, removing or clearing. Opening a list, a
 * shared link or the bare page included, is not an edit, so it never replaces or clears it.
 */
const KEY = "impulse-watchlist";

export function rememberList(items: WatchItem[]) {
  try {
    if (items.length) localStorage.setItem(KEY, watchParam(items));
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the link still holds the list
  }
}

export function rememberedList(): WatchItem[] {
  try {
    return parseWatchParam(localStorage.getItem(KEY) ?? "");
  } catch {
    return []; // storage blocked: nothing to bring back
  }
}
