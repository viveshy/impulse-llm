import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const model = await getDataSource().getModel(id);
  if (!model) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(model);
}
