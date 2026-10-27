import { watchCalendar } from "@/lib/catalog/watch-feeds";
import { loadWatchlist } from "@/lib/data/watchlist";
import { SITE_URL, watchlistHref } from "@/lib/routes";

/** The watchlist's retirement dates, as a calendar to subscribe to or import. */
export async function GET(req: Request) {
  const { index, items, rows } = await loadWatchlist(new URL(req.url).searchParams.getAll("w"));
  const ics = watchCalendar(rows, {
    link: `${SITE_URL}${watchlistHref(items)}`,
    today: index.today,
    stamp: index.generatedAt ?? `${index.today}T00:00:00Z`,
  });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="impulse-watchlist.ics"',
      "cache-control": "public, max-age=900",
    },
  });
}
