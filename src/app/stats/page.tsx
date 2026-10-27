import type { Metadata } from "next";
import Link from "next/link";
import { getDataSource } from "@/lib/data";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { canonicalPage } from "@/lib/routes";
import { formatCompact, formatCount, formatDate } from "@/lib/utils/format";
import { showVisits, VISITS_SHOWN_ABOVE } from "@/lib/visits";
import { Container } from "@/components/site/Container";
import { DailyChart } from "@/components/stats/DailyChart";
import { StatTile } from "@/components/ui/StatTile";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Site stats",
  description: "How many people use impulse, counted without cookies and without storing IP addresses.",
};

const tile = (n: number) => (n < 10_000 ? formatCount(n) : formatCompact(n));

function Ranked({
  title,
  unit,
  rows,
  empty,
}: {
  title: string;
  unit: string;
  rows: { label: React.ReactNode; key: string; n: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-[14px] border border-border bg-panel p-5 shadow-[var(--shadow)]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
        {rows.length > 0 && <span className="text-[12.5px] text-ink-3">{unit}</span>}
      </div>
      {rows.length ? (
        <ul className="mt-3 space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate text-ink-2">{r.label}</span>
                <span className="tabular-nums text-ink">{formatCount(r.n)}</span>
              </div>
              <div className="mt-1 h-[6px] rounded-full bg-accent-dim">
                <div className="h-full rounded-full bg-chart" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[14px] text-ink-3">{empty}</p>
      )}
    </div>
  );
}

export default async function StatsPage() {
  const [s, index] = await Promise.all([getDataSource().getAnalyticsSummary(30, 60), getCatalogIndex().catch(() => null)]);

  return (
    <Container className="py-10">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Site stats</h1>
      <p className="mt-1 max-w-[70ch] text-[15px] text-ink-3">
        How many people use impulse. Counted without cookies, and without storing anyone&rsquo;s IP address.
      </p>

      {!s ? (
        <p className="mt-8 rounded-[12px] border border-border bg-panel p-4 text-ink-3">Stats are unavailable right now.</p>
      ) : !showVisits(s.totals.visitors) ? (
        <p className="mt-8 rounded-[12px] border border-border bg-panel p-4 text-ink-3">
          Counting{s.allTime.since ? ` since ${formatDate(s.allTime.since)}` : ""}. The numbers show here once more than{" "}
          {VISITS_SHOWN_ABOVE} people have visited in {s.days} days.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={`Visitors, ${s.days} days`} value={tile(s.totals.visitors)} sub="each person counted once a day" />
            <StatTile label={`Page views, ${s.days} days`} value={tile(s.totals.views)} />
            <StatTile label="Today" value={tile(s.today.visitors)} sub={`visitors, ${formatCount(s.today.views)} page views (UTC)`} />
            <StatTile
              label="All-time page views"
              value={tile(s.allTime.views)}
              sub={s.allTime.since ? `since ${formatDate(s.allTime.since)}` : undefined}
            />
          </div>

          <DailyChart daily={s.daily} />

          <div className="grid gap-6 lg:grid-cols-2">
            <Ranked
              title="Most viewed pages"
              unit="views"
              empty="No page views yet."
              rows={s.topPages.map((p) => ({
                key: p.path,
                n: p.views,
                // Paths come from visitors' browsers: link only to pages that exist.
                label:
                  index && canonicalPage(index, p.path) === p.path ? (
                    <Link href={p.path} className="hover:text-ink hover:underline">
                      {p.path}
                    </Link>
                  ) : (
                    p.path
                  ),
              }))}
            />
            <Ranked
              title="Where visitors come from"
              unit="visitors"
              empty="No referring sites yet."
              rows={s.topReferrers.map((r) => ({ key: r.host, n: r.visitors, label: r.host }))}
            />
          </div>

          <div className="rounded-[14px] border border-border bg-sunken p-5 text-[14px] leading-[1.6] text-ink-2">
            <h2 className="text-[15px] font-semibold text-ink">How counting works</h2>
            <p className="mt-2">
              Each page view sends its path, plus the referring site on the first view of a visit. The server turns your
              IP address and browser name into a code using a secret that changes every day and is then deleted, and
              stores only that code. So a visitor is counted once per day: the same person on two days counts as two
              visitors, and nobody can be followed from one day to the next. Bots, automated browsers and browsers that
              send Do Not Track or Global Privacy Control are not counted, and neither are views of pages that don&rsquo;t
              exist. So that no single source can inflate the numbers, the server also caps the views it counts from one
              address a day, keeping that tally in memory only. There are no cookies.
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}
