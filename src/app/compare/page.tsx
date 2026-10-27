import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { findAlternatives } from "@/lib/catalog/alternatives";
import { isPriceOption } from "@/lib/catalog/group";
import { frontierLineup } from "@/lib/catalog/select";
import type { CanonicalModel } from "@/lib/catalog/types";
import { MAX_COMPARE, parseCompareParam } from "@/lib/compare";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { compareHref } from "@/lib/routes";
import { AddModel } from "@/components/compare/AddModel";
import { CompareTable } from "@/components/compare/CompareTable";
import { Container } from "@/components/site/Container";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const [index, sp] = await Promise.all([getCatalogIndex(), searchParams]);
  const models = parseCompareParam(index, sp.m);
  return {
    title: models.length > 1 ? models.map((m) => m.name).join(" vs ") : "Compare models",
    description: "Prices, monthly cost, limits and capabilities of AI models side by side.",
    alternates: { canonical: models.length > 1 ? compareHref(models) : "/compare" },
  };
}

function Suggestions({ title, sets }: { title: string; sets: { label: string; models: CanonicalModel[] }[] }) {
  if (!sets.length) return null;
  return (
    <div className="mt-8">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((s) => (
          <Link
            key={s.label}
            href={compareHref(s.models)}
            className="rounded-[12px] border border-border bg-panel p-4 shadow-[var(--shadow)] hover:border-border-strong"
          >
            <div className="font-medium text-ink">{s.label}</div>
            <div className="mt-1 text-[13.5px] text-ink-3">{s.models.map((m) => m.name).join(" · ")}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const [index, sp] = await Promise.all([getCatalogIndex(), searchParams]);
  const models = parseCompareParam(index, sp.m);
  const pairs = models.map((m) => `${m.labSlug}/${m.slug}`);
  const lineup = frontierLineup(index, MAX_COMPARE);

  // Ready-made comparisons for an empty page: the newest and the cheapest from each frontier lab, and each lab's lineup.
  const heads = lineup.map((g) => g.models[0]).filter(Boolean);
  const cheapestPerLab = lineup
    .map((g) =>
      g.models
        .filter((m) => isPriceOption(m.reference))
        .sort((a, b) => (a.reference.blended ?? Infinity) - (b.reference.blended ?? Infinity))[0],
    )
    .filter(Boolean);
  const starters = [
    { label: "The newest from each lab", models: heads },
    { label: "The cheapest from each lab", models: cheapestPerLab },
    ...lineup.filter((g) => g.models.length > 1).map((g) => ({ label: `${g.lab.name}'s lineup`, models: g.models })),
  ].filter((s) => s.models.length > 1);

  // With one model picked, offer the usual rivals: other labs first, then a smaller sibling.
  const alt = models.length === 1 ? findAlternatives(models[0], index) : null;
  const rivals = alt
    ? [...alt.frontier, ...alt.sameLab].map((a) => a.model).filter((m, i, arr) => arr.indexOf(m) === i).slice(0, 5)
    : [];

  return (
    <Container className="py-10">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Compare models</h1>
      <p className="mt-1 max-w-[70ch] text-[15px] text-ink-3">
        Up to {MAX_COMPARE} models side by side: list prices, what a month of real traffic costs, limits and
        capabilities. The best value in each row is marked with a check.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AddModel current={pairs} autoFocus={!models.length} />
        {models.length > 0 && (
          <Link href="/compare" className="text-[14px] text-ink-3 hover:text-ink hover:underline">
            Clear
          </Link>
        )}
      </div>

      {rivals.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13.5px]">
          <span className="text-ink-3">Add a rival:</span>
          {rivals.map((r) => (
            <Link
              key={r.slug}
              href={compareHref([...models, r])}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-panel px-3 py-[3px] text-ink-2 hover:border-border-strong hover:text-ink"
            >
              <Plus size={13} /> {r.name}
            </Link>
          ))}
        </div>
      )}

      {models.length > 0 && (
        <div className="mt-6">
          <CompareTable models={models} index={index} />
        </div>
      )}

      {models.length === 0 && <Suggestions title="Start from" sets={starters} />}
    </Container>
  );
}
