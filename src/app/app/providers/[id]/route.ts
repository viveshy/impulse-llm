import { getCatalogIndex } from "@/lib/data/catalog-index";
import { legacyHostPath } from "@/lib/routes";

/** Old provider links (`/app/providers/<id>`) redirect to the host's page. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, index] = await Promise.all([params, getCatalogIndex()]);
  return new Response(null, { status: 308, headers: { location: legacyHostPath(index, id) } });
}
