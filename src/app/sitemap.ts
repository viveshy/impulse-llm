import type { MetadataRoute } from "next";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { SITE_URL } from "@/lib/routes";
import { sitemapPages } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await getCatalogIndex();
  // Every page is built from the catalog, so each changed when it last did.
  const lastModified = index.generatedAt ?? index.today;
  return sitemapPages(index).map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, lastModified, priority }));
}
