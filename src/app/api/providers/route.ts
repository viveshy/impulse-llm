import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";

export async function GET() {
  const providers = await getDataSource().getProviders();
  return NextResponse.json(providers);
}
