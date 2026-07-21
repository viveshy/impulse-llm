import { NextResponse, type NextRequest } from "next/server";
import { getDataSource } from "@/lib/data";
import { parseModelQuery } from "@/lib/models-query-url";

/**
 * Same-origin proxy to the data source (real API on the server). The browser's
 * React Query hooks call this instead of the data source directly, so the backend
 * URL and full-catalog paging stay server-side.
 */
export async function GET(req: NextRequest) {
  const query = parseModelQuery(req.nextUrl.searchParams);
  const models = await getDataSource().getModels(query);
  return NextResponse.json(models);
}
