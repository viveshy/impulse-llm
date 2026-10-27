import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowUpRight } from "lucide-react";
import { cloudPage, retiresBy } from "@/lib/catalog/clouds";
import { labById } from "@/lib/catalog/labs";
import { addDays } from "@/lib/catalog/select";
import { ZONES } from "@/lib/clouds";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { cloudHref, hostHref } from "@/lib/routes";
import { CloudOffersTable } from "@/components/clouds/CloudOffersTable";
import { MissingTable } from "@/components/clouds/MissingTable";
import { Container } from "@/components/site/Container";
import { CloudMark, HostMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";
import { StatTile } from "@/components/ui/StatTile";
import { ParamChips } from "@/components/ui/TierTabs";

// Rendered per request: the zone filter lives in the query string. The catalog itself is cached in memory.

type Params = Promise<{ cloud: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Past this many, the other models fold away behind a toggle. */
const OTHER_OPEN = 12;

/** Once per request: the metadata and the page both ask for it. */
const build = cache(async (cloud: string, zone?: string) => {
  const index = await getCatalogIndex();
  let id = cloud;
  try {
    id = decodeURIComponent(cloud);
  } catch {}
  return { index, page: cloudPage(index, id.toLowerCase(), zone) };
});

async function load(params: Params, searchParams: SearchParams) {
  const [{ cloud }, sp] = await Promise.all([params, searchParams]);
  return build(cloud, typeof sp.zone === "string" ? sp.zone : undefined);
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Promise<Metadata> {
  const { page } = await load(params, searchParams);
  if (!page) return { title: "Cloud not found" };
  const c = page.cloud;
  return {
    title: `Frontier AI models on ${c.name}`,
    description: `Which frontier models ${c.name} sells through ${page.services.map((s) => s.host.name).join(" and ")}, at what price against the labs' own APIs, in which regions, and what it retires next.`,
  };
}

export default async function CloudPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { index, page } = await load(params, searchParams);
  if (!page) notFound();
  const { cloud, services, zones, zone, lineup, missing, other } = page;
  const today = index.today;
  const several = services.length > 1;
  const z = ZONES.find((x) => x.id === zone);
  const labs = [...new Set(lineup.map((o) => o.model.labId))].map((id) => labById(id)?.name ?? id);
  const retiring = [...lineup, ...other].filter((o) => retiresBy(o, addDays(today, 365))).length;
  const noRegions = services.filter((s) => !s.regions).map((s) => s.host.name);
  // "in Europe", or for global endpoints, which aren't a place: "on global endpoints".
  const where = !z ? "" : z.id === "global" ? ` on ${z.where}` : ` in ${z.where}`;
  const otherTable = (
    <CloudOffersTable offers={other} today={today} services={several} regions={zones.length > 0} released />
  );

  return (
    <Container className="py-8">
      <nav aria-label="Breadcrumb" className="text-[13.5px] text-ink-3">
        <Link href="/clouds" className="hover:text-ink">
          Clouds
        </Link>
      </nav>
      <header className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CloudMark id={cloud.id} name={cloud.name} size={44} />
            <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">{cloud.name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink-2">
            {services.map(({ host }) => (
              <Link key={host.slug} href={hostHref(host.slug)} className="inline-flex items-center gap-2 hover:text-ink hover:underline">
                <HostMark slug={host.slug} name={host.name} size={22} />
                {host.name}
              </Link>
            ))}
            <a
              href={cloud.regionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-ink-3 hover:text-ink hover:underline"
            >
              {cloud.short}&rsquo;s own list by region <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[600px]">
          <StatTile label="Lineup" value={`${lineup.length} of ${lineup.length + missing.length}`} sub="current frontier models" />
          <StatTile label="Labs" value={labs.length} sub={labs.join(", ") || undefined} />
          <StatTile label="Other models" value={other.length} sub="from the last two years" />
          <StatTile label="Retiring" value={retiring} sub="next 12 months" />
        </div>
      </header>

      {zones.length > 0 && (
        <div className="mt-10">
          <ParamChips
            base={cloudHref(cloud.id)}
            param="zone"
            value={zone ?? "all"}
            options={[{ id: "all", label: "All regions" }, ...zones.map((id) => ({ id, label: ZONES.find((z) => z.id === id)!.name }))]}
          />
          <p className="mt-2 max-w-[80ch] text-[13.5px] text-ink-3">
            {z
              ? `${z.id === "global" ? "Prices and dates are those of the global endpoints, which can serve a request from any region" : `Prices and dates are those of the listings in ${z.where}`}; listings that name no region drop out here.${noRegions.length ? ` ${noRegions.join(" and ")} doesn't list regions per model.` : ""}`
              : "Pick a region to see what is sold there, and at what price, if your data has to stay in it."}
          </p>
        </div>
      )}

      <div className="mt-10 space-y-12">
        <Section
          id="lineup"
          title={`Current frontier models on ${cloud.name}${where}`}
          description="The frontier labs' general-purpose models from the last 18 months, at this cloud's cheapest price for each, per million tokens."
        >
          {lineup.length ? (
            <CloudOffersTable offers={lineup} today={today} services={several} regions={zones.length > 0} />
          ) : (
            <p className="text-ink-3">None of the current frontier models is listed{where}.</p>
          )}
        </Section>

        {missing.length > 0 && (
          <Section
            id="missing"
            title={z ? `Not listed${where}` : `Not on ${cloud.name}`}
            description={
              z
                ? `Current frontier models ${cloud.name} has no listing for${where}, and the other clouds that sell them, in any region.`
                : "Current frontier models this cloud doesn't sell, and where else to get them."
            }
          >
            <MissingTable
              missing={missing}
              cloud={cloud}
              outside={z && (z.id === "global" ? "regional endpoints only" : `outside ${z.where}`)}
            />
          </Section>
        )}

        {other.length > 0 && (
          <Section
            id="other"
            title={`Other frontier models on ${cloud.name}${where}`}
            description={
              <>
                Older versions, previews and models their lab has retired, released in the last two years. Anything older
                is on the{" "}
                {services.map(({ host }, i) => (
                  <span key={host.slug}>
                    {i > 0 && " and "}
                    <Link href={hostHref(host.slug)} className="text-accent hover:underline">
                      {host.name}
                    </Link>
                  </span>
                ))}{" "}
                {several ? "pages" : "page"}.
              </>
            }
          >
            {other.length > OTHER_OPEN ? (
              <details>
                <summary className="mb-3 cursor-pointer text-[14.5px] font-medium text-accent">
                  Show {other.length} other models
                </summary>
                {otherTable}
              </details>
            ) : (
              otherTable
            )}
          </Section>
        )}

        <section id="about" className="max-w-[75ch] scroll-mt-20 space-y-3 text-[14px] leading-[1.6] text-ink-3">
          <h2 className="text-[16px] font-semibold text-ink-2">Where this comes from</h2>
          <p>
            The listings come from LiteLLM&rsquo;s model map, which the catalog reads every 6 hours; retirement dates are
            checked against the hosts&rsquo; own notices, as on{" "}
            <Link href="/retiring" className="text-accent hover:underline">
              Retiring
            </Link>
            . A model {cloud.name} added in the last few days may not show yet:{" "}
            <a href={cloud.regionsUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              {cloud.short}&rsquo;s own list
            </a>{" "}
            has every model and region.
          </p>
          {zones.length > 0 ? (
            <p>
              Regions are the ones the catalog has a listing for: a cross-region profile such as Europe, or a single
              region in it. A model listed without a region may run in more of them.
              {noRegions.length > 0 && ` ${noRegions.join(" and ")} doesn't list regions per model.`}
            </p>
          ) : (
            <p>{services.map((s) => s.host.name).join(" and ")} doesn&rsquo;t list regions per model, so there is no region filter here.</p>
          )}
        </section>
      </div>
    </Container>
  );
}
