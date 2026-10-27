import { getCatalogIndex } from "@/lib/data/catalog-index";
import { llmsTxt } from "@/lib/seo";

export const revalidate = 3600;

export async function GET() {
  return new Response(llmsTxt(await getCatalogIndex()), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
