import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const models = await getDataSource().getModelsByProvider(id);
  return NextResponse.json(models);
}
