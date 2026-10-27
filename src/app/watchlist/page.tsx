import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NOTICES_CHECKED } from "@/lib/catalog/notices";
import { ACT_WITHIN_DAYS, exampleWatchlist, watchRows, watchSummary } from "@/lib/catalog/watch";
import { loadWatchlist } from "@/lib/data/watchlist";
import { watchlistHref } from "@/lib/routes";
import { formatDate } from "@/lib/utils/format";
import { watchParam } from "@/lib/watchlist";
import { Container } from "@/components/site/Container";
import { StatTile } from "@/components/ui/StatTile";
import { AddToWatchlist } from "@/components/watchlist/AddToWatchlist";
import { EditLink } from "@/components/watchlist/EditLink";
import { WatchAlerts } from "@/components/watchlist/WatchAlerts";
import { WatchMemory } from "@/components/watchlist/WatchMemory";
import { WatchTable } from "@/components/watchlist/WatchTable";

export const metadata: Metadata = {
  title: "Watchlist",
  description:
    "Track the AI models your team runs: when each host retires them, what to move to, and price changes, with calendar and RSS alerts.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function WatchlistPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const { index, items, rows, pricesKnown } = await loadWatchlist(sp.w);
  const add = typeof sp.add === "string" && sp.add ? sp.add.toLowerCase() : undefined;
  const s = watchSummary(rows);
  const example = rows.length ? [] : exampleWatchlist(index);

  return (
    <Container className="py-10">
      <WatchMemory w={watchParam(items)} add={add} />
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Watchlist</h1>
      <p className="mt-1 max-w-[72ch] text-[15px] text-ink-3">
        The models your team runs, on the hosts you run them on: when each one retires, what to move to, and what it
        costs. Nothing is stored on our side. The list lives in the link, and this browser remembers the last list you
        edited.
      </p>

      <div className="mt-6">
        <AddToWatchlist items={items} preselect={add} />
      </div>

      {rows.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Act now" value={s.act} sub={`gone, retired or retiring within ${ACT_WITHIN_DAYS} days`} />
            <StatTile label="Retiring later" value={s.later} sub={`more than ${ACT_WITHIN_DAYS} days out`} />
            <StatTile label="Newer model out" value={s.newer} sub="nothing retiring yet" />
            <StatTile label="Price moves" value={pricesKnown ? s.moved : "-"} sub="in the last 30 days" />
          </div>
          <div className="mt-6">
            <WatchTable rows={rows} items={items} />
          </div>
          <div className="mt-3 flex justify-end">
            <EditLink items={[]} className="text-[14px] text-ink-3 hover:text-ink hover:underline">
              Clear the list
            </EditLink>
          </div>
          <WatchAlerts w={watchParam(items)} />
        </>
      ) : (
        <div className="mt-8 max-w-[760px] rounded-[14px] border border-dashed border-border-strong p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-ink">Start with the models you run</h2>
          <p className="mt-1 text-[14.5px] text-ink-3">
            Search above, pick the host you call the model on and, if you pin versions, the exact version or region.
            Each one you add shows its retirement date on that host, what to move to and its price.
          </p>
          {example.length > 0 && (
            <Link
              href={watchlistHref(example)}
              className="group mt-4 inline-flex items-center gap-2 text-[14.5px] font-medium text-accent hover:underline"
            >
              Try it with an example list
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          {example.length > 0 && (
            <p className="mt-1 text-[13.5px] text-ink-3">
              {watchRows(index, example)
                .map((r) => `${r.name} on ${r.hostName}`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      <section id="about" className="mt-12 max-w-[75ch] scroll-mt-20 space-y-3 text-[14px] leading-[1.6] text-ink-3">
        <h2 className="text-[16px] font-semibold text-ink-2">How it works</h2>
        <p>
          Retirement dates are the hosts&rsquo; own, as on{" "}
          <Link href="/retiring" className="text-accent hover:underline">
            Retiring
          </Link>
          , checked against the notices of OpenAI, Anthropic, Google, Microsoft and Amazon on {formatDate(NOTICES_CHECKED)}.
          A model you watch on a host follows every version and region the host lists; when only some of them retire, the
          row says which. Pin one version or region to follow just that one.
        </p>
        <p>
          &ldquo;Move to&rdquo; is the newest model in the same line that no API retires within three months of the date,
          with whether your host serves it and how its price compares with what you pay now.
        </p>
        <p>Prices are list prices per million tokens. Price moves come from the last 30 days of price history.</p>
      </section>
    </Container>
  );
}
