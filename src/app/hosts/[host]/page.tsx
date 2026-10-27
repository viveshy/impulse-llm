import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hostPage } from "@/lib/catalog/directory";
import { HOST_KIND_LABEL } from "@/lib/catalog/hosts";
import { labById } from "@/lib/catalog/labs";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { hostHref, labHref, modelHref } from "@/lib/routes";
import { formatCount, formatReleaseDate, formatTokens } from "@/lib/utils/format";
import { KIND_LABEL } from "@/components/models/bits";
import { Container } from "@/components/site/Container";
import { Badge } from "@/components/ui/Badge";
import { HostMark } from "@/components/ui/BrandMark";
import { Delta, PricePair } from "@/components/ui/Price";
import { StatTile } from "@/components/ui/StatTile";
import { ParamChips } from "@/components/ui/TierTabs";

// Rendered per request: the tier and page filters live in the query string. The catalog
// itself is cached in memory, so a render is cheap.

type Params = Promise<{ host: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 100;

async function load(params: Params) {
  const [{ host }, index] = await Promise.all([params, getCatalogIndex()]);
  let slug = host;
  try {
    slug = decodeURIComponent(host);
  } catch {}
  return { index, page: hostPage(index, slug.toLowerCase()) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { page } = await load(params);
  if (!page) return { title: "Host not found" };
  return {
    title: `${page.host.name}: models and prices`,
    description: `The ${page.host.modelCount} models ${page.host.name} serves, with its price for each against the lab's own.`,
  };
}

export default async function HostPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ page }, sp] = await Promise.all([load(params), searchParams]);
  if (!page) notFound();
  const { host, offers } = page;
  const lab = labById(page.labSlug);
  // Open with the frontier view only where frontier models are a real share of the host.
  const defaultTier = host.frontierCount >= Math.max(5, host.modelCount * 0.2) ? "frontier" : "all";
  const tier = sp.tier === "all" || sp.tier === "frontier" ? sp.tier : defaultTier;
  const rows = tier === "frontier" ? offers.filter((o) => o.model.tier === "frontier") : offers;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageNo = Math.min(Math.max(1, Number(sp.page) || 1), pages);
  const shown = rows.slice((pageNo - 1) * PAGE_SIZE, pageNo * PAGE_SIZE);
  const plan = host.kind === "subscription" || host.kind === "local";
  const ownApi = host.kind === "first-party";
  // A lab's own API is the headline for its models; anywhere else, compare with it.
  const compared = offers.filter((o) => o.vsHeadline !== null);
  const showDelta = !plan && compared.length > 0;
  const cheaper = compared.filter((o) => o.vsHeadline! < -0.005).length;
  const dearer = compared.filter((o) => o.vsHeadline! > 0.005).length;
  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    if (tier !== defaultTier) q.set("tier", tier);
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return s ? `${hostHref(host.slug)}?${s}` : hostHref(host.slug);
  };
  // The default choice goes first: it is the one ParamChips leaves out of the URL.
  const tiers =
    host.frontierCount > 0
      ? [
          { id: "frontier", label: "Frontier labs", count: host.frontierCount },
          { id: "all", label: "All labs", count: host.modelCount },
        ].sort((a) => (a.id === defaultTier ? -1 : 1))
      : [];

  return (
    <Container className="py-8">
      <nav aria-label="Breadcrumb" className="text-[13.5px] text-ink-3">
        <Link href="/hosts" className="hover:text-ink">
          Hosts
        </Link>
      </nav>
      <header className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <HostMark slug={host.slug} name={host.name} size={44} />
            <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">{host.name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-ink-2">
            <Badge>{HOST_KIND_LABEL[host.kind]}</Badge>
            {lab && (
              <span>
                {ownApi && <>{lab.name}&rsquo;s own API · </>}
                <Link href={labHref(lab.id)} className="hover:text-ink hover:underline">
                  All {lab.name} models
                </Link>
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[560px]">
          <StatTile label="Models" value={formatCount(host.modelCount)} />
          <StatTile label="Frontier" value={host.frontierCount} />
          <StatTile label="Cheaper here" value={showDelta ? cheaper : "-"} sub={showDelta ? "than the headline price" : undefined} />
          <StatTile label="Dearer here" value={showDelta ? dearer : "-"} sub={showDelta ? "than the headline price" : undefined} />
        </div>
      </header>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        {tiers.length > 0 ? (
          <ParamChips base={hostHref(host.slug)} param="tier" value={tier} options={tiers} />
        ) : (
          <span />
        )}
        <span className="text-[13.5px] text-ink-3">
          {plan ? "Included in the plan; no per-token price." : "Cheapest listing per model, USD per million tokens."}
        </span>
      </div>

      <div className="tbl-wrap mt-4">
        <table className="tbl">
          <thead>
            <tr>
              <th>Model</th>
              {!plan && <th className="num">Here, input / output</th>}
              {showDelta && <th className="num hidden sm:table-cell">vs headline</th>}
              <th className="num hidden sm:table-cell">Context</th>
              <th className="hidden sm:table-cell">Released</th>
              <th className="num hidden sm:table-cell">Listings</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.model.slug}>
                <td className="wrap sm:whitespace-nowrap">
                  <Link href={modelHref(o.model)} className="font-medium text-ink hover:text-accent hover:underline">
                    {o.model.name}
                  </Link>
                  <div className="text-[13px] text-ink-3">
                    <Link href={labHref(o.model.labSlug)} className="hover:text-ink">
                      {o.model.labName}
                    </Link>
                    {o.model.kind !== "chat" ? ` · ${KIND_LABEL[o.model.kind]}` : ""}
                    {o.listing.apiModelId !== o.model.slug && (
                      <span className="ml-1 font-mono text-[12px] text-ink-4 max-sm:ml-0 max-sm:block max-sm:break-all">
                        {o.listing.apiModelId}
                      </span>
                    )}
                  </div>
                </td>
                {!plan && (
                  <td className="num">
                    <PricePair input={o.listing.pricing.inputPerMTok} output={o.listing.pricing.outputPerMTok} />
                    {/* On phones the comparison rides under the price, and only when there is a difference. */}
                    {showDelta && o.vsHeadline !== null && Math.round(o.vsHeadline * 100) !== 0 && (
                      <div className="text-[12px] text-ink-3 sm:hidden">
                        <Delta ratio={o.vsHeadline} /> vs {o.model.reference.host.name}
                      </div>
                    )}
                  </td>
                )}
                {showDelta && (
                  <td className="num hidden sm:table-cell">
                    {o.vsHeadline === null ? (
                      <span className="text-ink-4">-</span>
                    ) : (
                      <>
                        <Delta ratio={o.vsHeadline} />
                        <div className="text-[12px] text-ink-3">vs {o.model.reference.host.name}</div>
                      </>
                    )}
                  </td>
                )}
                <td className="num hidden text-ink-2 sm:table-cell">
                  {o.model.contextWindow ? formatTokens(o.model.contextWindow) : "-"}
                </td>
                <td className="hidden text-ink-2 sm:table-cell">
                  {o.model.releaseDate ? formatReleaseDate(o.model.releaseDate) : "-"}
                </td>
                <td className="num hidden text-ink-3 sm:table-cell">{o.otherListings + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-[14px] text-ink-3">
          <span>
            {(pageNo - 1) * PAGE_SIZE + 1}-{Math.min(pageNo * PAGE_SIZE, rows.length)} of {formatCount(rows.length)}
          </span>
          <div className="flex gap-2">
            {pageNo > 1 && (
              <Link href={pageHref(pageNo - 1)} className="rounded-[8px] border border-border bg-panel px-3 py-1 text-ink-2 hover:text-ink">
                Previous
              </Link>
            )}
            {pageNo < pages && (
              <Link href={pageHref(pageNo + 1)} className="rounded-[8px] border border-border bg-panel px-3 py-1 text-ink-2 hover:text-ink">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
