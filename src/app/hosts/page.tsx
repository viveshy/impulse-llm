import type { Metadata } from "next";
import Link from "next/link";
import type { HostKind } from "@/lib/catalog/hosts";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { hostHref } from "@/lib/routes";
import { Container } from "@/components/site/Container";
import { HostMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Where to run AI models",
  description: "Every API that serves the models in the catalog: labs' own APIs, clouds, inference providers, gateways and subscription plans.",
};

const KINDS: { kind: HostKind; title: string; blurb: string }[] = [
  {
    kind: "first-party",
    title: "Lab APIs",
    blurb: "Each lab's own API. New models usually land here first, and its price is the headline others are compared with.",
  },
  {
    kind: "cloud",
    title: "Clouds",
    blurb: "AWS, Azure, Google Cloud and others resell lab models under their own contracts, regions and quotas.",
  },
  {
    kind: "inference",
    title: "Inference providers",
    blurb: "GPU clouds that serve open-weight models, often cheaper or faster than the lab.",
  },
  {
    kind: "gateway",
    title: "Gateways",
    blurb: "One key for many providers. They route each request and may add a margin.",
  },
  {
    kind: "subscription",
    title: "Subscription plans",
    blurb: "Flat monthly plans that include model use, so they have no per-token price.",
  },
  { kind: "local", title: "Local runtimes", blurb: "Run open weights on your own hardware." },
];

export default async function HostsPage() {
  const index = await getCatalogIndex();
  return (
    <Container className="space-y-12 py-10">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Hosts</h1>
        <p className="mt-1 max-w-[70ch] text-[15px] text-ink-3">
          {index.hosts.length} places to call a model. The same model can cost very different amounts depending on
          where you call it; each host page shows its price against the lab&rsquo;s own.
        </p>
      </div>
      {KINDS.map(({ kind, title, blurb }) => {
        const hosts = index.hosts.filter((h) => h.kind === kind);
        if (!hosts.length) return null;
        return (
          <Section key={kind} id={kind} title={title} description={blurb}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Host</th>
                    <th className="num">Frontier models</th>
                    <th className="num">All models</th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <HostMark slug={h.slug} name={h.name} size={24} />
                          <Link href={hostHref(h.slug)} className="font-medium text-ink hover:text-accent hover:underline">
                            {h.name}
                          </Link>
                        </div>
                      </td>
                      <td className="num text-ink-2">{h.frontierCount || "-"}</td>
                      <td className="num text-ink-2">{h.modelCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })}
    </Container>
  );
}
