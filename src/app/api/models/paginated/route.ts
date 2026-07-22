import { NextResponse, type NextRequest } from "next/server";
import { getDataSource } from "@/lib/data";
import { MODELS_PAGE_SIZE } from "@/lib/data/query";
import { parseModelQuery } from "@/lib/models-query-url";

/**
 * Cursor-paginated window over the catalog, for the models list UI. Same-origin proxy
 * to the data source, same pattern as /api/models, but bounded per request so the
 * client never has to fetch or render the full ~3k-row catalog at once.
 */
export async function GET(req: NextRequest) {
  const query = parseModelQuery(req.nextUrl.searchParams);
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limitParam = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(200, limitParam) : MODELS_PAGE_SIZE;

  const page = await getDataSource().getModelsPage(query, cursor, limit);
  return NextResponse.json(page);
}
