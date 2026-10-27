import type { Metadata } from "next";
import Link from "next/link";
import { labSummaries, type LabSummary } from "@/lib/catalog/directory";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { labHref, modelHref } from "@/lib/routes";
import { formatAgo, formatReleaseDate } from "@/lib/utils/format";
import { Container } from "@/components/site/Container";
import { LabMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "AI labs",
  description: "The labs behind every model in the catalog: their newest releases, how many models they ship and where you can run them.",
  alternates: { canonical: "/labs" },
};

const markId = (l: LabSummary) => (l.slug === "other" ? null : l.slug);

function LabCard({ lab, today }: { lab: LabSummary; today: string }) {
  return (
    <Link
      href={labHref(lab.slug)}
      className="flex flex-col rounded-[14px] border border-border bg-panel p-5 shadow-[var(--shadow)] transition-colors hover:border-border-strong"
    >
      <div className="flex items-center gap-3">
        <LabMark labId={markId(lab)} name={lab.name} size={36} />
        <div className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{lab.name}</div>
      </div>
      <div className="mt-4 text-[13px] text-ink-3">Newest</div>
      <div className="font-medium text-ink">{lab.newest?.name ?? "-"}</div>
      {lab.newest?.releaseDate && <div className="text-[13px] text-ink-3">{formatAgo(lab.newest.releaseDate, today)}</div>}
      <div className="mt-4 flex gap-4 border-t border-border-2 pt-3 text-[13.5px] text-ink-2">
        <span>
          <span className="font-medium text-ink">{lab.lineupCount}</span> in the lineup
        </span>
        <span>
          <span className="font-medium text-ink">{lab.hostCount}</span> hosts
        </span>
      </div>
    </Link>
  );
}

function LabTable({ labs }: { labs: LabSummary[] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Lab</th>
            <th>Newest model</th>
            <th>Released</th>
            <th className="num">Models</th>
            <th className="num">Hosts</th>
          </tr>
        </thead>
        <tbody>
          {labs.map((l) => (
            <tr key={l.slug}>
              <td>
                <Link href={labHref(l.slug)} className="flex items-center gap-2 font-medium text-ink hover:text-accent hover:underline">
                  <LabMark labId={markId(l)} name={l.name} size={24} />
                  {l.name}
                </Link>
              </td>
              <td>
                {l.newest ? (
                  <Link href={modelHref(l.newest)} className="text-ink-2 hover:text-accent hover:underline">
                    {l.newest.name}
                  </Link>
                ) : (
                  <span className="text-ink-3">-</span>
                )}
              </td>
              <td className="text-ink-2">{l.newest?.releaseDate ? formatReleaseDate(l.newest.releaseDate) : "-"}</td>
              <td className="num text-ink-2">{l.modelCount}</td>
              <td className="num text-ink-2">{l.hostCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function LabsPage() {
  const index = await getCatalogIndex();
  const labs = labSummaries(index);
  const frontier = labs.filter((l) => l.tier === "frontier");
  const open = labs.filter((l) => l.tier === "open");
  const other = labs.filter((l) => l.tier === "other");

  return (
    <Container className="space-y-12 py-10">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Labs</h1>
        <p className="mt-1 max-w-[70ch] text-[15px] text-ink-3">
          Who makes the models. The frontier labs ship the most capable closed models; open-weight labs publish weights
          that anyone can host, which is why the same model often sells at a dozen prices.
        </p>
      </div>
      <Section id="frontier" title="Frontier labs">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {frontier.map((l) => (
            <LabCard key={l.slug} lab={l} today={index.today} />
          ))}
        </div>
      </Section>
      {open.length > 0 && (
        <Section id="open" title="Open-weight labs">
          <LabTable labs={open} />
        </Section>
      )}
      {other.length > 0 && (
        <Section id="other" title="Other labs">
          <LabTable labs={other} />
        </Section>
      )}
    </Container>
  );
}
