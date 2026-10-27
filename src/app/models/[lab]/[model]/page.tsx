import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowRight, BellPlus, Calculator, CalendarClock, GitCompareArrows, History } from "lucide-react";
import { findAlternatives } from "@/lib/catalog/alternatives";
import { hostRows } from "@/lib/catalog/detail";
import { isPriceOption } from "@/lib/catalog/group";
import { quickstartSnippets } from "@/lib/catalog/quickstart";
import {
  daysBetween,
  hostRetirements,
  liveSuccessor,
  retirementLabel,
  type HostRetirement,
} from "@/lib/catalog/select";
import type { CanonicalModel, CatalogIndex } from "@/lib/catalog/types";
import { getDataSource } from "@/lib/data";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { compareHref, labHref, modelHref, resolveModelRoute, watchAddHref } from "@/lib/routes";
import { formatAgo, formatDate, formatDaysLeft, formatTokens, formatUsd } from "@/lib/utils/format";
import { Alternatives } from "@/components/detail/Alternatives";
import { Benchmarks } from "@/components/detail/Benchmarks";
import { Capabilities } from "@/components/detail/Capabilities";
import { Lineage } from "@/components/detail/Lineage";
import { PricingCard } from "@/components/detail/PricingCard";
import { Quickstart } from "@/components/detail/Quickstart";
import { Sources } from "@/components/detail/Sources";
import { WhereToRun } from "@/components/detail/WhereToRun";
import { KIND_LABEL } from "@/components/models/bits";
import { Container } from "@/components/site/Container";
import { Badge } from "@/components/ui/Badge";
import { CopyId } from "@/components/ui/CopyButton";
import { LabMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";
import { StatTile } from "@/components/ui/StatTile";

export const revalidate = 300;

// Rendered on first visit, then cached and refreshed like the rest of the site.
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ lab: string; model: string }>;

async function load(params: Params) {
  const [{ lab, model }, index] = await Promise.all([params, getCatalogIndex()]);
  return { index, route: resolveModelRoute(index, lab, model) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { route } = await load(params);
  if (!route || !("model" in route)) return { title: "Model not found" };
  const m = route.model;
  const ref = m.reference;
  const price = ref.priced ? `${formatUsd(ref.pricing.inputPerMTok)} in / ${formatUsd(ref.pricing.outputPerMTok)} out per million tokens` : "pricing";
  return {
    title: `${m.name} pricing, hosts and alternatives`,
    description: `${m.name} by ${m.labName}: ${price}, ${formatTokens(m.contextWindow)} context, on ${m.hostCount} hosts. Cheaper alternatives, retirement dates and code to call it.`,
    alternates: { canonical: modelHref(m) },
  };
}

/** "OpenAI retires it on 11 Dec 2026 (in 46 days); Azure OpenAI on 9 Feb 2027", up to four dates. */
function retirementSentence(rs: HostRetirement[], today: string): string {
  const byDate = new Map<string, string[]>();
  for (const r of rs) byDate.set(r.date, [...(byDate.get(r.date) ?? []), retirementLabel(r)]);
  return [...byDate]
    .slice(0, 4)
    .map(([date, hosts], i) =>
      i === 0
        ? `${hosts.join(", ")} ${hosts.length > 1 ? "retire" : "retires"} it on ${formatDate(date)} (${formatDaysLeft(daysBetween(today, date))})`
        : `${hosts.join(", ")} on ${formatDate(date)}`,
    )
    .join("; ");
}

function lineOf(m: CanonicalModel, index: CatalogIndex): CanonicalModel[] {
  const head = (m.successorSlug && index.bySlug.get(m.successorSlug)) || m;
  const line = [head, ...head.predecessorSlugs.map((s) => index.bySlug.get(s)).filter((x): x is CanonicalModel => !!x)];
  if (!line.some((x) => x.slug === m.slug)) line.push(m);
  return line.slice(0, 8);
}

export default async function ModelPage({ params }: { params: Params }) {
  const { index, route } = await load(params);
  if (!route) notFound();
  if ("redirect" in route) permanentRedirect(route.redirect);
  const m = route.model;
  const ref = m.reference;
  const detail = await getDataSource().getModel(ref.id);

  const rows = hostRows(m);
  const headline = isPriceOption(ref) ? ref.blended : null;
  const alternatives = findAlternatives(m, index);
  const successor = liveSuccessor(m, index);
  const line = lineOf(m, index);
  // Retirements worth a banner: within six months, on an API (not a subscription plan).
  const soon = hostRetirements(m, { apiOnly: true }).filter(
    (r) => r.date >= index.today && daysBetween(index.today, r.date) <= 180,
  );
  const labRetires = soon.find((r) => r.byLab && !r.only)?.date;
  const dropped = new Set(soon.filter((r) => !r.only && !r.except).map((r) => r.host));
  const staying = m.hostCount - dropped.size;
  const benchmarks = detail?.benchmarks ?? [];
  const self = `${m.labSlug}/${m.slug}`;

  return (
    <Container className="py-8">
      <nav aria-label="Breadcrumb" className="text-[13.5px] text-ink-3">
        <Link href="/models" className="hover:text-ink">
          Models
        </Link>
        <span className="mx-2">/</span>
        <Link href={labHref(m.labSlug)} className="hover:text-ink">
          {m.labName}
        </Link>
      </nav>

      <header className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-[760px]">
          <div className="flex items-center gap-3">
            <LabMark labId={m.labId} name={m.labName} size={40} />
            <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[36px]">{m.name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {m.tier === "frontier" && <Badge tone="accent">Frontier lab</Badge>}
            {m.openWeights && <Badge>Open weights</Badge>}
            {m.kind !== "chat" && <Badge>{KIND_LABEL[m.kind]}</Badge>}
            {m.preview && <Badge tone="warn">Preview</Badge>}
            {labRetires && (
              <Badge tone={daysBetween(index.today, labRetires) <= 30 ? "err" : "warn"} icon={<CalendarClock size={12} />}>
                Retiring {formatDate(labRetires)}
              </Badge>
            )}
          </div>
          {m.description && <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">{m.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-ink-3">
            <span className="flex items-center gap-1">
              API id <CopyId id={ref.apiModelId} />
            </span>
            {m.releaseDate && (
              <span>
                Released {formatDate(m.releaseDate)} ({formatAgo(m.releaseDate, index.today)})
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <Link
            href={watchAddHref(m)}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border-strong bg-panel px-4 text-[14.5px] font-medium text-ink hover:bg-hover"
          >
            <BellPlus size={16} /> Watch
          </Link>
          <Link
            href={compareHref([m])}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border-strong bg-panel px-4 text-[14.5px] font-medium text-ink hover:bg-hover"
          >
            <GitCompareArrows size={16} /> Compare
          </Link>
          <Link
            href={`/calculator?m=${self}`}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-accent px-4 text-[14.5px] font-medium text-accent-ink hover:opacity-90"
          >
            <Calculator size={16} /> Estimate cost
          </Link>
        </div>
      </header>

      {(successor || soon.length > 0) && (
        <div className="mt-6 space-y-2">
          {successor && (
            <Link
              href={modelHref(successor)}
              className="flex items-center gap-3 rounded-[12px] border border-accent-line/50 bg-accent-dim px-4 py-3 text-[14.5px] text-ink hover:border-accent-line"
            >
              <History size={17} className="flex-none text-accent" />
              <span>
                A newer model in this line is out: <strong className="font-semibold">{successor.name}</strong>
                {successor.releaseDate ? `, released ${formatDate(successor.releaseDate)}` : ""}.
              </span>
              <ArrowRight size={16} className="ml-auto flex-none text-accent" />
            </Link>
          )}
          {soon.length > 0 && (
            <div className="flex items-center gap-3 rounded-[12px] border border-border bg-warn-dim px-4 py-3 text-[14.5px] text-ink">
              <CalendarClock size={17} className="flex-none text-warn" />
              <span>
                {retirementSentence(soon, index.today)}.{" "}
                {staying > 0
                  ? `${staying} ${staying === 1 ? "host keeps" : "hosts keep"} serving it.`
                  : "No API serves it after that."}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Input / 1M" value={ref.priced ? formatUsd(ref.pricing.inputPerMTok) : "-"} sub={ref.priced ? `at ${ref.host.name}` : "not listed"} />
        <StatTile label="Output / 1M" value={ref.priced ? formatUsd(ref.pricing.outputPerMTok) : "-"} sub={ref.priced ? `at ${ref.host.name}` : "not listed"} />
        <StatTile label="Context window" value={m.contextWindow ? formatTokens(m.contextWindow) : "-"} sub="tokens" />
        <StatTile label="Max output" value={m.maxOutputTokens ? formatTokens(m.maxOutputTokens) : "-"} sub="tokens per reply" />
        <StatTile label="Hosts" value={m.hostCount} sub={`${m.listings.length} listings`} />
        <StatTile
          label="Released"
          value={m.releaseDate ? formatAgo(m.releaseDate, index.today) : "-"}
          sub={m.releaseDate ? formatDate(m.releaseDate) : "date not published"}
        />
      </div>

      <div className="mt-12 space-y-12">
        {ref.priced && (
          <Section id="pricing" title="Pricing" description={`List prices at ${ref.host.name}, in US dollars per million tokens.`}>
            <PricingCard model={m} calculatorHref={`/calculator?m=${self}`} />
          </Section>
        )}

        <Section
          id="hosts"
          title="Where to run it"
          description={`${m.hostCount} ${m.hostCount === 1 ? "host" : "hosts"} serve ${m.name}. The comparison is on blended price, 3 parts input to 1 part output.`}
        >
          <WhereToRun rows={rows} today={index.today} headline={headline} />
        </Section>

        <Section id="capabilities" title="Capabilities">
          <Capabilities model={m} />
        </Section>

        <Section
          id="alternatives"
          title={alternatives.priced ? "Cheaper alternatives" : "Similar models"}
          description={
            alternatives.priced
              ? "Current models that cost less and keep most of what this one can do: tools, vision, reasoning, structured output, caching and enough context."
              : "This model has no listed price, so these are current models with similar capabilities."
          }
        >
          <Alternatives buckets={alternatives} labName={m.labName} priceHost={ref.host.name} />
        </Section>

        {benchmarks.length > 0 && (
          <Section id="benchmarks" title="Benchmarks" description="Scores published on the model card.">
            <Benchmarks items={benchmarks} />
          </Section>
        )}

        {line.length > 1 && (
          <Section id="line" title="Model line" description="Newer and older versions, at each lab's own price.">
            <Lineage model={m} line={line} />
          </Section>
        )}

        <Section id="quickstart" title="Call it" description={`Using ${ref.host.name}'s API.`}>
          <Quickstart snippets={quickstartSnippets(m)} />
        </Section>

        <Section id="sources" title="Sources">
          <Sources model={m} spec={detail?.spec} />
        </Section>
      </div>
    </Container>
  );
}
