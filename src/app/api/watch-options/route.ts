import { watchOptions } from "@/lib/catalog/watch";
import { getCatalogIndex } from "@/lib/data/catalog-index";

/** Where a model can be watched (hosts, and each host's versions and regions), for the watchlist's add box. */
export async function GET(req: Request) {
  const slug = (new URL(req.url).searchParams.get("m") ?? "").trim().toLowerCase();
  const index = await getCatalogIndex();
  const m = index.bySlug.get(slug);
  if (!m) return Response.json({ error: "No such model" }, { status: 404 });
  return Response.json(
    { model: { slug: m.slug, name: m.name, lab: m.labName }, hosts: watchOptions(m, index.today) },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
