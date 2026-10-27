import { releaseRadar } from "@/lib/catalog/select";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { modelHref, SITE_URL as SITE } from "@/lib/routes";
import { formatTokens, formatUsd } from "@/lib/utils/format";

export const revalidate = 300;


const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** RSS 2.0: the latest 50 releases from frontier and open-weight labs. */
export async function GET() {
  const index = await getCatalogIndex();
  const items = releaseRadar(index, { days: 365, tier: "all" })
    .filter((m) => m.tier !== "other")
    .slice(0, 50)
    .map((m) => {
      const ref = m.reference;
      const price = ref.priced
        ? `${formatUsd(ref.pricing.inputPerMTok)} input / ${formatUsd(ref.pricing.outputPerMTok)} output per million tokens at ${ref.host.name}`
        : "No list price yet";
      const summary = [m.description, `${price}.`, m.contextWindow ? `${formatTokens(m.contextWindow)} token context.` : ""]
        .filter(Boolean)
        .join(" ");
      return `    <item>
      <title>${esc(`${m.name} (${m.labName})`)}</title>
      <link>${SITE}${modelHref(m)}</link>
      <guid isPermaLink="true">${SITE}${modelHref(m)}</guid>
      <pubDate>${new Date(`${m.releaseDate}T12:00:00Z`).toUTCString()}</pubDate>
      <category>${esc(m.labName)}</category>
      <description>${esc(summary)}</description>
    </item>`;
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Impulse: new AI models</title>
    <link>${SITE}/releases</link>
    <atom:link href="${SITE}/releases/feed.xml" rel="self" type="application/rss+xml" />
    <description>New models from frontier and open-weight labs, with launch prices.</description>
    <language>en</language>
${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
}
