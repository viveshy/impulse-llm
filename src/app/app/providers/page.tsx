import type { Metadata } from "next";
import { getDataSource } from "@/lib/data";
import { ProvidersExplorer } from "@/components/providers/ProvidersExplorer";

export const metadata: Metadata = { title: "Providers" };

export default async function ProvidersPage() {
  const ds = getDataSource();
  const [providers, facets] = await Promise.all([ds.getProviders(), ds.getFacets()]);
  const counts = Object.fromEntries(facets.providers.map((p) => [p.id, p.count]));

  return <ProvidersExplorer providers={providers} counts={counts} />;
}
