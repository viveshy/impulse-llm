import { jsonLdString } from "@/lib/seo";

/** Structured data for search engines, in a script tag no value can break out of. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
