import type { Metadata } from "next";
import { parseWorkload } from "@/lib/calculator";
import { calculatorRows } from "@/lib/catalog/calculator";
import { parseCompareParam } from "@/lib/compare";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { Calculator } from "@/components/calculator/Calculator";
import { Container } from "@/components/site/Container";

export const metadata: Metadata = {
  title: "AI model cost calculator",
  description:
    "What a month of your traffic costs on every frontier model, with prompt caching and batch discounts, at the lab's API or the cheapest host.",
};

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [index, sp] = await Promise.all([getCatalogIndex(), searchParams]);
  const picked = parseCompareParam(index, sp.m);
  const rows = calculatorRows(index, picked.map((m) => m.slug));
  const priced = new Set(rows.map((r) => r.s));

  return (
    <Container className="py-10">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Cost calculator</h1>
      <p className="mt-1 max-w-[70ch] text-[15px] text-ink-3">
        Describe your traffic once and see the monthly bill on every model, cheapest first. Change anything and the
        ranking updates; the address bar keeps your numbers so you can share them.
      </p>
      <div className="mt-8">
        <Calculator
          rows={rows}
          initial={{
            workload: parseWorkload(sp),
            source: sp.src === "cheapest" ? "cheapest" : "lab",
            open: sp.open === "1",
            older: sp.older === "1",
          }}
          pinned={picked.filter((m) => priced.has(m.slug)).map((m) => ({ s: m.slug, pair: `${m.labSlug}/${m.slug}` }))}
          unpriced={picked.filter((m) => !priced.has(m.slug)).map((m) => m.name)}
        />
      </div>
    </Container>
  );
}
