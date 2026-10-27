import { searchRows } from "@/lib/catalog/select";
import { getCatalogIndex } from "@/lib/data/catalog-index";

export const revalidate = 300;

/** Compact rows for the ⌘K palette, fetched once when it first opens. */
export async function GET() {
  const index = await getCatalogIndex();
  return Response.json(
    { labs: labRows(index.models), hosts: index.hosts.map((h) => ({ s: h.slug, n: h.name, c: h.modelCount })), models: searchRows(index) },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}

function labRows(models: { labSlug: string; labName: string }[]) {
  const seen = new Map<string, { s: string; n: string; c: number }>();
  for (const m of models) {
    const row = seen.get(m.labSlug) ?? { s: m.labSlug, n: m.labName, c: 0 };
    row.c++;
    seen.set(m.labSlug, row);
  }
  return [...seen.values()].sort((a, b) => b.c - a.c);
}
