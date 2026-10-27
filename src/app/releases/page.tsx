import type { Metadata } from "next";
import Link from "next/link";
import { Rss } from "lucide-react";
import { releaseRadar, type TierFilter } from "@/lib/catalog/select";
import type { CanonicalModel } from "@/lib/catalog/types";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { labHref, modelHref } from "@/lib/routes";
import { formatTokens } from "@/lib/utils/format";
import { KIND_LABEL } from "@/components/models/bits";
import { Container } from "@/components/site/Container";
import { Badge } from "@/components/ui/Badge";
import { PricePair } from "@/components/ui/Price";
import { ParamChips } from "@/components/ui/TierTabs";

export const metadata: Metadata = {
  title: "Releases",
  description: "Every new AI model from the frontier labs, month by month, with launch prices and context windows.",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TIERS: { id: TierFilter; label: string }[] = [
  { id: "frontier", label: "Frontier labs" },
  { id: "open", label: "Open weights" },
  { id: "all", label: "Everything" },
];

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [index, sp] = await Promise.all([getCatalogIndex(), searchParams]);
  const tier = TIERS.find((t) => t.id === sp.tier)?.id ?? "frontier";
  const releases = releaseRadar(index, { days: 365, tier });
  const byMonth = new Map<string, CanonicalModel[]>();
  for (const m of releases) {
    const key = m.releaseDate!.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), m]);
  }

  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Releases</h1>
          <p className="mt-1 text-[15px] text-ink-3">
            {releases.length} models released in the last 12 months, newest first, priced at launch hosts.
          </p>
        </div>
        <a
          href="/releases/feed.xml"
          className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-panel px-3 py-2 text-[14px] text-ink-2 hover:border-border-strong hover:text-ink"
        >
          <Rss size={15} /> RSS feed
        </a>
      </div>
      <div className="mt-6">
        <ParamChips base="/releases" param="tier" value={tier} options={TIERS} />
      </div>

      <div className="mt-8 space-y-10">
        {[...byMonth].map(([month, models]) => {
          const [y, mo] = month.split("-").map(Number);
          return (
            <section key={month} aria-labelledby={`m-${month}`}>
              <h2 id={`m-${month}`} className="sticky top-[58px] z-10 -mx-1 bg-bg/95 px-1 py-2 text-[15px] font-semibold text-ink-2 backdrop-blur">
                {MONTHS[mo - 1]} {y} <span className="font-normal text-ink-3">· {models.length}</span>
              </h2>
              <ol className="mt-2 divide-y divide-border-2 rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]">
                {models.map((m) => (
                  <li key={m.slug} className="grid grid-cols-[44px_1fr] gap-x-3 px-4 py-3 sm:grid-cols-[52px_1fr_auto] sm:items-center">
                    <span className="text-[13px] text-ink-3">
                      {Number(m.releaseDate!.slice(8, 10))} {MONTHS[mo - 1].slice(0, 3)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={modelHref(m)} className="font-medium text-ink hover:text-accent hover:underline">
                          {m.name}
                        </Link>
                        {m.kind !== "chat" && <Badge>{KIND_LABEL[m.kind]}</Badge>}
                        {m.preview && <Badge tone="warn">Preview</Badge>}
                        {m.openWeights && tier !== "open" && <Badge>Open weights</Badge>}
                      </div>
                      <div className="text-[13px] text-ink-3">
                        <Link href={labHref(m.labSlug)} className="hover:text-ink">
                          {m.labName}
                        </Link>
                        {m.contextWindow ? ` · ${formatTokens(m.contextWindow)} context` : ""}
                        {` · ${m.hostCount} ${m.hostCount === 1 ? "host" : "hosts"}`}
                      </div>
                    </div>
                    <div className="col-start-2 mt-1 text-[14px] sm:col-start-3 sm:mt-0 sm:text-right">
                      <PricePair input={m.reference.pricing.inputPerMTok} output={m.reference.pricing.outputPerMTok} />
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
        {!releases.length && <p className="text-ink-3">No releases in the last 12 months.</p>}
      </div>
    </Container>
  );
}
