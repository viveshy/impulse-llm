import { watchRows } from "@/lib/catalog/watch";
import { parseWatchParam } from "@/lib/watchlist";
import { getDataSource } from ".";
import { getCatalogIndex } from "./catalog-index";

/** A `w` parameter resolved against the current catalog and the last 30 days of price changes. */
export async function loadWatchlist(raw: string | string[] | undefined) {
  const items = parseWatchParam(raw);
  const [index, changes] = await Promise.all([
    getCatalogIndex(),
    items.length ? getDataSource().getPriceChanges(30) : Promise.resolve(null),
  ]);
  return { index, items, rows: watchRows(index, items, changes ?? []), pricesKnown: changes !== null };
}
