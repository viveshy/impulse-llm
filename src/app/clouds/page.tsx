import type { Metadata } from "next";
import Link from "next/link";
import { cloudOverview, type CloudSummary } from "@/lib/catalog/clouds";
import { labById } from "@/lib/catalog/labs";
import { NOT_COVERED } from "@/lib/clouds";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { cloudHref } from "@/lib/routes";
import { CloudMatrix } from "@/components/clouds/CloudMatrix";
import { zoneNames } from "@/components/clouds/CloudOffersTable";
import { Container } from "@/components/site/Container";
import { CloudMark, LabMark } from "@/components/ui/BrandMark";
import { Section } from "@/components/ui/Section";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Frontier AI models on AWS, Azure and Google Cloud",
  description:
    "Which of the frontier labs' current models AWS, Microsoft Azure and Google Cloud sell, at what price against the lab's own API, in which regions, and what they retire next.",
};

const labName = (id: string) => labById(id)?.name ?? id;

function CloudCard({ s, lineupSize }: { s: CloudSummary; lineupSize: number }) {
  return (
    <Link
      href={cloudHref(s.cloud.id)}
      className="flex flex-col rounded-[14px] border border-border bg-panel p-5 shadow-[var(--shadow)] transition-colors hover:border-border-strong"
    >
      <div className="flex items-center gap-3">
        <CloudMark id={s.cloud.id} name={s.cloud.name} size={36} />
        <div className="min-w-0">
          <div className="text-[18px] font-semibold tracking-[-0.02em] text-ink">{s.cloud.name}</div>
          <div className="text-[13px] text-ink-3">{s.services.map((x) => x.host.name).join(" · ")}</div>
        </div>
      </div>
      <div className="mt-5 text-[28px] font-semibold tracking-[-0.02em] text-ink">
        {s.carried}
        <span className="ml-2 text-[14.5px] font-normal tracking-normal text-ink-3">
          of {lineupSize} current frontier models
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2">
        {s.labs.map((id) => (
          <LabMark key={id} labId={id} name={labName(id)} size={22} />
        ))}
        <span>{s.labs.map(labName).join(", ")}</span>
      </div>
      <div className="mt-4 space-y-1 border-t border-border-2 pt-3 text-[13.5px] text-ink-2">
        <div>
          <span className="font-medium text-ink">{s.retiring}</span> {s.retiring === 1 ? "retirement" : "retirements"} in
          the next 12 months
        </div>
        <div className="text-ink-3">{s.zones.length ? `Regions listed: ${zoneNames(s.zones)}` : "Regions not listed per model"}</div>
      </div>
    </Link>
  );
}

export default async function CloudsPage() {
  const index = await getCatalogIndex();
  const o = cloudOverview(index);

  return (
    <Container className="space-y-12 py-10">
      <div>
        <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Clouds</h1>
        <p className="mt-1 max-w-[72ch] text-[15px] text-ink-3">
          Most teams buy AI through the cloud they already use: one bill, and the security and data controls they already
          run. Which of the frontier labs&rsquo; current models does each cloud sell, at what price, and where?
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {o.clouds.map((s) => (
          <CloudCard key={s.cloud.id} s={s} lineupSize={o.lineupSize} />
        ))}
      </div>

      <Section
        id="lineup"
        title="The frontier lineup, cloud by cloud"
        description="Each lab's current general-purpose models. A tick means the cloud sells it; the figure is its cheapest price there against the lab's own API."
      >
        <CloudMatrix overview={o} />
      </Section>

      <section id="about" className="max-w-[75ch] scroll-mt-20 space-y-3 text-[14px] leading-[1.6] text-ink-3">
        <h2 className="text-[16px] font-semibold text-ink-2">How it works</h2>
        <p>
          The lineup is the frontier labs&rsquo; general-purpose models from the last 18 months that each lab sells through
          its own API. Prices are list prices per million tokens, compared on blended price, 3 parts input to 1 part
          output; a cloud&rsquo;s price is its cheapest listing of the model, often a global endpoint, and a regional
          one can cost more.
        </p>
        <p>
          What each cloud sells comes from LiteLLM&rsquo;s model map, which the catalog reads every 6 hours, so a model
          added in the last few days may not show yet. Each cloud&rsquo;s page links the cloud&rsquo;s own list.
        </p>
        <p>
          Not covered yet:{" "}
          {NOT_COVERED.map((c, i) => (
            <span key={c.name}>
              {i > 0 && (i === NOT_COVERED.length - 1 ? " and " : ", ")}
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {c.name}
              </a>
            </span>
          ))}
          . The model map&rsquo;s lists for them lag their own, so it would show them without models they sell; the links
          go to their own lists.
        </p>
      </section>
    </Container>
  );
}
