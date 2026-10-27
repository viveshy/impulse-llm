import { getCatalogIndex } from "@/lib/data/catalog-index";
import { legacyModelPath } from "@/lib/routes";

/** Old model links (`/app/models/<id>`) redirect to the model's page. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const [{ id }, index] = await Promise.all([params, getCatalogIndex()]);
  // A relative Location keeps the public host when the app sits behind a proxy.
  return new Response(null, { status: 308, headers: { location: legacyModelPath(index, id) } });
}
