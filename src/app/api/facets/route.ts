import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";

export async function GET() {
  const facets = await getDataSource().getFacets();
  return NextResponse.json(facets);
}
