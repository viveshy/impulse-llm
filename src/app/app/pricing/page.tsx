import type { Metadata } from "next";
import { getDataSource } from "@/lib/data";
import { Topbar } from "@/components/layout/Topbar";
import { PricingExplorer } from "@/components/pricing/PricingExplorer";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const ds = getDataSource();
  const [models, providers] = await Promise.all([ds.getModels({}), ds.getProviders()]);

  return (
    <>
      <Topbar>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Pricing</span>
        <span className="text-ink-4">·</span>
        <span className="text-[14px] text-ink-3">cost calculator</span>
      </Topbar>
      <PricingExplorer models={models} providers={providers} />
    </>
  );
}
