import { Suspense } from "react";
import type { Metadata } from "next";
import { getDataSource } from "@/lib/data";
import { Topbar } from "@/components/layout/Topbar";
import { CompareView } from "@/components/compare/CompareView";

export const metadata: Metadata = { title: "Compare" };

export default async function ComparePage() {
  const ds = getDataSource();
  const [allModels, providers] = await Promise.all([ds.getModels({}), ds.getProviders()]);

  return (
    <>
      <Topbar>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Compare</span>
        <span className="text-ink-4">·</span>
        <span className="text-[14px] text-ink-3">side by side</span>
      </Topbar>
      <Suspense fallback={<div className="p-6 text-[14px] text-ink-4">Loading…</div>}>
        <CompareView allModels={allModels} providers={providers} />
      </Suspense>
    </>
  );
}
