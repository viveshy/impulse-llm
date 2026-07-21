import type { Metadata } from "next";
import { getDataSource } from "@/lib/data";
import { Topbar } from "@/components/layout/Topbar";
import { ApiExplorer } from "@/components/api/ApiExplorer";

export const metadata: Metadata = { title: "API Explorer" };

export default async function ApiExplorerPage() {
  const ds = getDataSource();
  const [providers, models] = await Promise.all([ds.getProviders(), ds.getModels({})]);

  return (
    <>
      <Topbar>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">API Explorer</span>
        <span className="text-ink-4">·</span>
        <span className="text-[14px] text-ink-3">endpoints & snippets</span>
      </Topbar>
      <ApiExplorer providers={providers} models={models} />
    </>
  );
}
