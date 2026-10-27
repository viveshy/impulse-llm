import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { labPage } from "@/lib/catalog/directory";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { compareHref, hostHref } from "@/lib/routes";
import { RetiringList } from "@/components/home/RetiringList";
import { ModelTable } from "@/components/models/ModelTable";
import { Container } from "@/components/site/Container";
import { Badge } from "@/components/ui/Badge";
import { LabMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";
import { StatTile } from "@/components/ui/StatTile";

export const revalidate = 300;

// Rendered on first visit, then cached and refreshed like the rest of the site.
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ lab: string }>;

const TIER_LABEL = { frontier: "Frontier lab", open: "Open-weight lab", other: "Lab" } as const;
const OLDER_OPEN = 12;

async function load(params: Params) {
  const [{ lab }, index] = await Promise.all([params, getCatalogIndex()]);
  let slug = lab;
  try {
    slug = decodeURIComponent(lab);
  } catch {}
  return { index, page: labPage(index, slug.toLowerCase()) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { page } = await load(params);
  if (!page) return { title: "Lab not found" };
  const s = page.summary;
  return {
    title: `${s.name} models and prices`,
    description: `Every ${s.name} model: the current lineup with prices, what is being retired, and the ${s.hostCount} hosts that serve them.`,
  };
}

export default async function LabPage({ params }: { params: Params }) {
  const { index, page } = await load(params);
  if (!page) notFound();
  const s = page.summary;

  return (
    <Container className="py-8">
      <nav aria-label="Breadcrumb" className="text-[13.5px] text-ink-3">
        <Link href="/labs" className="hover:text-ink">
          Labs
        </Link>
      </nav>
      <header className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <LabMark labId={s.slug === "other" ? null : s.slug} name={s.name} size={44} />
            <h1 className="text-[30px] font-semibold tracking-[-0.03em] sm:text-[36px]">{s.name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px]">
            <Badge tone={s.tier === "frontier" ? "accent" : "neutral"}>{TIER_LABEL[s.tier]}</Badge>
            {s.website && (
              <a
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ink-2 hover:text-ink hover:underline"
              >
                {s.website.replace(/^https?:\/\//, "")} <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[600px]">
          <StatTile label="Models" value={s.modelCount} sub="not retired" />
          <StatTile label="Lineup" value={s.lineupCount} sub="last 18 months" />
          <StatTile label="Hosts" value={s.hostCount} />
          <StatTile label="Retiring" value={page.retiring.length} sub="next 12 months" />
        </div>
      </header>

      <div className="mt-12 space-y-12">
        <Section
          id="lineup"
          title="Current lineup"
          description="General-purpose models released in the last 18 months, newest first. Prices are the lab's own, per million tokens."
          action={page.lineup.length > 1 ? { href: compareHref(page.lineup.slice(0, 4)), label: "Compare them" } : undefined}
        >
          {page.lineup.length ? (
            <ModelTable models={page.lineup} today={index.today} showLab={false} />
          ) : (
            <p className="text-ink-3">No general-purpose models released in the last 18 months.</p>
          )}
        </Section>

        {page.retiring.length > 0 && (
          <Section
            id="retiring"
            title="Being retired"
            description="Dates announced by an API host in the next 12 months."
            action={{ href: "/retiring?tier=all", label: "All retirements" }}
          >
            <RetiringList items={page.retiring} />
          </Section>
        )}

        {page.specialised.length > 0 && (
          <Section id="specialised" title="Images, audio, search and more">
            <ModelTable models={page.specialised} today={index.today} showLab={false} showKind />
          </Section>
        )}

        {page.older.length > 0 && (
          <Section id="older" title="Older models" description="Superseded or undated, but still served somewhere.">
            {page.older.length > OLDER_OPEN ? (
              <details>
                <summary className="mb-3 cursor-pointer text-[14.5px] font-medium text-accent">
                  Show {page.older.length} older models
                </summary>
                <ModelTable models={page.older} today={index.today} showLab={false} showKind />
              </details>
            ) : (
              <ModelTable models={page.older} today={index.today} showLab={false} showKind />
            )}
          </Section>
        )}

        <Section id="hosts" title={`Where to run ${s.name} models`} description="Hosts by how many of its models they serve.">
          <div className="flex flex-wrap gap-2">
            {page.hosts.map(({ host, count }) => (
              <Link
                key={host.id}
                href={hostHref(host.slug)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-[5px] text-[14px] text-ink-2 hover:border-border-strong hover:text-ink"
              >
                {host.name}
                <span className="text-ink-4">{count}</span>
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </Container>
  );
}
