import type { Metadata } from "next";
import { getDataSource } from "@/lib/data";
import { Topbar } from "@/components/layout/Topbar";
import { Playground } from "@/components/playground/Playground";

export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage() {
  const models = await getDataSource().getModels({ sort: "popularity" });

  return (
    <>
      <Topbar>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Playground</span>
        <span className="text-ink-4">·</span>
        <span className="text-[14px] text-ink-3">simulated</span>
      </Topbar>
      <Playground models={models} />
    </>
  );
}
