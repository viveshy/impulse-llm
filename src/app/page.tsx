import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { priceMoves } from "@/lib/catalog/changes";
import { cheapestListing } from "@/lib/catalog/group";
import { frontierLineup, releaseRadar, retiring } from "@/lib/catalog/select";
import { getDataSource } from "@/lib/data";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { compareHref, labHref, modelHref } from "@/lib/routes";
import { siteJsonLd } from "@/lib/seo";
import { formatCount, formatReleaseDate, formatTokens } from "@/lib/utils/format";
import { Container } from "@/components/site/Container";
import { HeroSearch } from "@/components/home/HeroSearch";
import { JsonLd } from "@/components/seo/JsonLd";
import { Lineup } from "@/components/home/Lineup";
import { PriceMoves } from "@/components/home/PriceMoves";
import { ReleaseCard } from "@/components/home/ReleaseCard";
import { RetiringList } from "@/components/home/RetiringList";
import { PricePair } from "@/components/ui/Price";
import { Section } from "@/components/ui/Section";
import { StatTile } from "@/components/ui/StatTile";

export const revalidate = 300;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [index, changes] = await Promise.all([getCatalogIndex(), getDataSource().getPriceChanges(30)]);

  const moves = changes ? priceMoves(changes, index) : null;
  const recent = releaseRadar(index, { days: 30 });
  const radar = (recent.length >= 6 ? recent : releaseRadar(index, { days: 60 })).slice(0, 6);
  const lineup = frontierLineup(index, 4);
  // A host dropping the model, not just one of its versions; the tracker lists those too.
  const retiringSoon = retiring(index, { fromDays: 0, toDays: 90, tier: "frontier", apiOnly: true }).filter(
    (r) => r.model.kind === "chat" && r.hosts.some((h) => !h.only),
  );
  const openReleases = releaseRadar(index, { days: 60, tier: "open" })
    .filter((m) => m.kind === "chat" && !m.specialPurpose)
    .slice(0, 6);
  const newest = lineup.map((g) => g.models[0]).filter(Boolean);
  const frontierCount = index.models.filter((m) => m.tier === "frontier").length;

  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <div className="border-b border-border bg-panel">
        <Container className="grid gap-10 py-12 md:py-16 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <p className="text-[14px] font-medium text-accent">The frontier model desk</p>
            <h1 className="mt-3 max-w-[16ch] text-[36px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[48px]">
              Every frontier model, priced on every host.
            </h1>
            <p className="mt-4 max-w-[58ch] text-[16.5px] leading-[1.6] text-ink-2">
              What OpenAI, Anthropic, Google and xAI ship, what each model costs wherever you can call it, what is
              about to be retired, and the cheaper ways to get the same job done.
            </p>
            <div className="mt-7">
              <HeroSearch placeholder={`Search ${formatCount(index.models.length)} models, labs and hosts…`} />
            </div>
            {newest.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[13.5px]">
                <span className="text-ink-3">Newest from each lab:</span>
                {newest.map((m) => (
                  <Link
                    key={m.slug}
                    href={modelHref(m)}
                    className="rounded-full border border-border bg-bg px-3 py-[3px] text-ink-2 hover:border-border-strong hover:text-ink"
                  >
                    {m.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="New frontier models" value={recent.length} sub="in the last 30 days" />
            <StatTile label="Retiring soon" value={retiringSoon.length} sub="frontier chat models, next 90 days" />
            <StatTile label="Price changes" value={moves ? moves.length : "-"} sub="in the last 30 days" />
            <StatTile
              label="Models tracked"
              value={formatCount(index.models.length)}
              sub={`${frontierCount} frontier · ${index.hosts.length} hosts`}
            />
          </div>
        </Container>
      </div>

      <Container className="space-y-14 pt-12">
        <Section
          id="releases"
          title="Just released"
          description="The newest frontier models, priced at each lab's own API."
          action={{ href: "/releases", label: "All releases" }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {radar.map((m) => (
              <ReleaseCard key={m.slug} model={m} today={index.today} />
            ))}
          </div>
        </Section>

        <Section
          id="lineup"
          title="Current lineups"
          description="What each frontier lab sells through its own API today, newest first. Prices are per million input / output tokens."
          action={newest.length > 1 ? { href: compareHref(newest), label: "Compare the newest" } : undefined}
        >
          <Lineup groups={lineup} />
        </Section>

        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr]">
          <Section
            id="retiring"
            title="Retiring soon"
            description="Frontier chat models that lab APIs and clouds stop serving in the next 90 days, and what to move to."
            action={{ href: "/retiring", label: "Retirement tracker" }}
          >
            <RetiringList items={retiringSoon.slice(0, 8)} />
          </Section>
          <Section id="prices" title="Price changes" description="List-price moves in the last 30 days, all labs and hosts.">
            <PriceMoves moves={moves ? moves.slice(0, 8) : null} />
          </Section>
        </div>

        {openReleases.length > 0 && (
          <Section
            id="open"
            title="Open-weight releases"
            description="New open models, at the cheapest host serving them."
            action={{ href: "/models?tier=open", label: "All open models" }}
          >
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Lab</th>
                    <th>Released</th>
                    <th className="num">Cheapest input / output</th>
                    <th className="num">Context</th>
                    <th className="num">Hosts</th>
                  </tr>
                </thead>
                <tbody>
                  {openReleases.map((m) => {
                    const cheap = cheapestListing(m);
                    return (
                      <tr key={m.slug}>
                        <td>
                          <Link href={modelHref(m)} className="font-medium text-ink hover:text-accent hover:underline">
                            {m.name}
                          </Link>
                        </td>
                        <td>
                          <Link href={labHref(m.labSlug)} className="text-ink-2 hover:text-ink">
                            {m.labName}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap text-ink-2">
                          {m.releaseDate ? formatReleaseDate(m.releaseDate) : "-"}
                        </td>
                        <td className="num">
                          {cheap ? (
                            <>
                              <PricePair input={cheap.pricing.inputPerMTok} output={cheap.pricing.outputPerMTok} />
                              <div className="text-[12.5px] text-ink-3">{cheap.host.name}</div>
                            </>
                          ) : (
                            <span className="text-ink-3">Not listed</span>
                          )}
                        </td>
                        <td className="num text-ink-2">{m.contextWindow ? formatTokens(m.contextWindow) : "-"}</td>
                        <td className="num text-ink-2">{m.hostCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <div className="flex flex-col items-start justify-between gap-4 rounded-[14px] border border-border bg-panel p-6 shadow-[var(--shadow)] md:flex-row md:items-center">
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em]">What would your workload cost?</h2>
            <p className="mt-1 text-[14.5px] text-ink-3">
              Put in your traffic and see the monthly bill on every current frontier model, with caching and batch
              discounts applied.
            </p>
          </div>
          <Link
            href="/calculator"
            className="inline-flex h-10 flex-none items-center gap-2 rounded-[10px] bg-accent px-4 text-[14.5px] font-medium text-accent-ink hover:opacity-90"
          >
            Open the calculator <ArrowRight size={15} />
          </Link>
        </div>
      </Container>
    </>
  );
}
