import { getCatalogIndex } from "@/lib/data/catalog-index";
import { legacyComparePath } from "@/lib/routes";

/** Old compare links (`/app/compare?ids=<listing id>,…`) redirect to the same comparison. */
export async function GET(req: Request) {
  const index = await getCatalogIndex();
  const ids = new URL(req.url).searchParams.get("ids");
  return new Response(null, { status: 308, headers: { location: legacyComparePath(index, ids) } });
}
