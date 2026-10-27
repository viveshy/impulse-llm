import { getCatalogIndex } from "@/lib/data/catalog-index";
import { llmsFullTxt } from "@/lib/seo";

export const revalidate = 3600;

export async function GET() {
  return new Response(llmsFullTxt(await getCatalogIndex()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
