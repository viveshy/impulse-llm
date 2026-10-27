import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/routes";

/**
 * Every crawler is welcome, search engines and AI assistants alike. Kept out: the API, and
 * links that only carry someone's own list or inputs (a watchlist, its feeds, a calculator setup).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/watchlist?", "/watchlist/", "/calculator?"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
