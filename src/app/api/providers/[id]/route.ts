import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await getDataSource().getProvider(id);
  if (!provider) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(provider);
}
