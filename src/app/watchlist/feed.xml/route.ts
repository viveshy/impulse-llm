import { watchFeed } from "@/lib/catalog/watch-feeds";
import { loadWatchlist } from "@/lib/data/watchlist";
import { SITE_URL, watchlistHref } from "@/lib/routes";
import { watchParam } from "@/lib/watchlist";

/** RSS 2.0: the watchlist's retirements as they come close, its price moves and newer models. */
export async function GET(req: Request) {
  const { index, items, rows } = await loadWatchlist(new URL(req.url).searchParams.getAll("w"));
  const xml = watchFeed(rows, {
    link: `${SITE_URL}${watchlistHref(items)}`,
    self: `${SITE_URL}/watchlist/feed.xml${items.length ? `?w=${watchParam(items)}` : ""}`,
    today: index.today,
    stamp: index.generatedAt ?? `${index.today}T00:00:00Z`,
  });
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=900" },
  });
}
