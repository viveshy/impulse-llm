import type { Metadata } from "next";
import Link from "next/link";
import { LABS } from "@/lib/catalog/labs";
import { filterModels } from "@/lib/catalog/select";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { filterHref, parseModelFilter } from "@/lib/model-filters";
import { formatCount } from "@/lib/utils/format";
import { Container } from "@/components/site/Container";
import { FilterBar } from "@/components/models/FilterBar";
import { ModelTable } from "@/components/models/ModelTable";

export const metadata: Metadata = {
  title: "Models",
  description: "Every frontier AI model with its price, context window, capabilities and hosts. Filter by lab, type and tier.",
};

const PAGE_SIZE = 100;

const TIER_TITLE = { frontier: "Frontier models", open: "Open-weight models", other: "Models from other labs", all: "All models" };

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [index, sp] = await Promise.all([getCatalogIndex(), searchParams]);
  const query = parseModelFilter(sp);
  const tier = query.tier ?? (query.lab || query.q ? "all" : "frontier");
  const rows = filterModels(index, query);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = new Map<string, number>();
  for (const m of index.models) counts.set(m.labSlug, (counts.get(m.labSlug) ?? 0) + 1);
  const labs = [...LABS.map((l) => ({ slug: l.id, name: l.name })), { slug: "other", name: "Independent" }]
    .map((l) => ({ ...l, count: counts.get(l.slug) ?? 0 }))
    .filter((l) => l.count > 0);

  return (
    <Container className="py-10">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">{TIER_TITLE[tier]}</h1>
      <p className="mt-1 text-[15px] text-ink-3">
        {formatCount(rows.length)} {rows.length === 1 ? "model" : "models"}. Prices are each lab&rsquo;s own API price
        per million tokens, or the cheapest well-known host when the lab doesn&rsquo;t sell it.
      </p>
      <div className="mt-6">
        <FilterBar query={query} tier={tier} labs={labs} />
      </div>
      <div className="mt-5">
        {shown.length ? (
          <ModelTable models={shown} today={index.today} showKind={query.kind === "all"} />
        ) : (
          <div className="rounded-[12px] border border-border bg-panel p-8 text-center text-ink-3">
            No models match these filters.{" "}
            <Link href="/models" className="text-accent hover:underline">
              Clear filters
            </Link>
          </div>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-[14px] text-ink-3">
          <span>
            {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, rows.length)} of {formatCount(rows.length)}
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <Link href={filterHref(query, { page: page - 1 })} className="rounded-[8px] border border-border bg-panel px-3 py-1 text-ink-2 hover:text-ink">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={filterHref(query, { page: page + 1 })} className="rounded-[8px] border border-border bg-panel px-3 py-1 text-ink-2 hover:text-ink">
                Next
              </Link>
            )}
          </span>
        </nav>
      )}
    </Container>
  );
}
