import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { getDataSource } from "@/lib/data";
import type { AuthType, Provider } from "@/lib/domain/types";
import { formatReleaseDate } from "@/lib/utils/format";
import { Topbar } from "@/components/layout/Topbar";
import { ProviderGlyph } from "@/components/common/ProviderGlyph";
import { MetricsStrip, type Metric } from "@/components/common/MetricsStrip";
import { Panel, KeyValue, SectionLabel } from "@/components/common/Panel";
import { EndpointList } from "@/components/providers/EndpointList";
import { ProviderModels } from "@/components/providers/ProviderModels";
import { ReleaseTimeline } from "@/components/providers/ReleaseTimeline";

type Params = Promise<{ id: string }>;

const CATEGORY_LABEL: Record<Provider["category"], string> = {
  frontier: "Frontier lab",
  open: "Open weights",
  cloud: "Cloud platform",
  inference: "Inference provider",
};

const AUTH_LABEL: Record<AuthType, string> = {
  "api-key": "API key",
  bearer: "Bearer token",
  oauth: "OAuth",
  "aws-sigv4": "AWS SigV4",
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const provider = await getDataSource().getProvider(id);
  return { title: provider?.name ?? "Provider" };
}

export default async function ProviderPage({ params }: { params: Params }) {
  const { id } = await params;
  const ds = getDataSource();

  const provider = await ds.getProvider(id);
  if (!provider) notFound();

  const models = await ds.getModelsByProvider(id);
  const avgInput = models.length
    ? models.reduce((s, m) => s + m.pricing.inputPerMTok, 0) / models.length
    : 0;

  const metrics: Metric[] = [
    { label: "Models", value: models.length },
    { label: "Endpoints", value: provider.endpoints.length },
    { label: "Regions", value: provider.regions.length },
    {
      label: "Avg input",
      value: (
        <>
          <span className="text-[15px] text-ink-3">$</span>
          {avgInput.toFixed(2)}
        </>
      ),
    },
    { label: "Auth", value: <span className="text-[16px]">{AUTH_LABEL[provider.authType]}</span> },
    { label: "SDKs", value: provider.sdks.length },
  ];

  const timeline = [...models]
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .slice(-5)
    .map((m) => ({ date: formatReleaseDate(m.releaseDate), name: m.name }));

  const host = hostname(provider.website);

  return (
    <>
      <Topbar
        actions={
          <a
            href={provider.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[28px] items-center gap-[6px] rounded-[6px] border border-border px-[10px] text-[15px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink"
          >
            <ExternalLink size={13} className="text-ink-3" />
            Visit website
          </a>
        }
      >
        <Link href="/app/providers" className="text-ink-3 hover:text-ink-2">
          Providers
        </Link>
        <span className="text-ink-4">/</span>
        <span className="text-ink">{provider.name}</span>
      </Topbar>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-start gap-4 px-6 pt-[22px]">
          <ProviderGlyph monogram={provider.monogram} size="lg" />
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em]">{provider.name}</h1>
            <div className="mt-[7px] text-[15px] text-ink-3">
              <span className="text-ink-2">{CATEGORY_LABEL[provider.category]}</span>
              {provider.foundedYear ? ` · Founded ${provider.foundedYear}` : ""} ·{" "}
              <a href={provider.website} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                {host}
              </a>
            </div>
          </div>
        </div>

        <p className="max-w-[74ch] px-6 pt-[16px] text-[16px] leading-[1.6] text-ink-2">
          {provider.description}
        </p>

        <div className="flex flex-col gap-[26px] px-6 pb-12 pt-[22px]">
          <MetricsStrip items={metrics} />

          <div className="grid grid-cols-1 gap-[26px] lg:grid-cols-[minmax(0,1fr)_296px]">
            <div className="flex min-w-0 flex-col gap-[30px]">
              <section>
                <SectionLabel>Endpoints</SectionLabel>
                <EndpointList endpoints={provider.endpoints} />
              </section>
              <section>
                <SectionLabel>Models · {models.length}</SectionLabel>
                <ProviderModels models={models} />
              </section>
              {timeline.length > 1 && (
                <section>
                  <SectionLabel>Release timeline</SectionLabel>
                  <ReleaseTimeline items={timeline} />
                </section>
              )}
            </div>

            <div className="flex flex-col gap-[24px]">
              <div>
                <SectionLabel>Details</SectionLabel>
                <Panel>
                  <KeyValue label="Category">{CATEGORY_LABEL[provider.category]}</KeyValue>
                  <KeyValue label="Website">
                    <a href={provider.website} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      {host}
                    </a>
                  </KeyValue>
                  <KeyValue label="Auth">{AUTH_LABEL[provider.authType]}</KeyValue>
                  {provider.foundedYear && <KeyValue label="Founded">{provider.foundedYear}</KeyValue>}
                  <KeyValue label="Regions">{provider.regions.length || "-"}</KeyValue>
                </Panel>
              </div>

              {provider.regions.length > 0 && (
                <div>
                  <SectionLabel>Regions</SectionLabel>
                  <Panel className="py-[14px]">
                    <div className="flex flex-wrap gap-[6px]">
                      {provider.regions.map((r) => (
                        <span
                          key={r}
                          className="rounded-[4px] border border-border px-[7px] py-px font-mono text-[12px] text-ink-2"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </Panel>
                </div>
              )}

              {provider.sdks.length > 0 && (
                <div>
                  <SectionLabel>SDKs</SectionLabel>
                  <Panel className="flex flex-col gap-[13px] py-[14px]">
                    {provider.sdks.map((s) => (
                      <div key={s.language} className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[14px] text-ink">{s.language}</span>
                          {s.docsUrl && (
                            <a
                              href={s.docsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-auto text-[13px] text-ink-4 hover:text-ink"
                            >
                              docs ↗
                            </a>
                          )}
                        </div>
                        {s.installCommand && (
                          <code className="mt-[5px] block truncate rounded-[5px] border border-border bg-bg px-[8px] py-[5px] font-mono text-[12px] text-ink-2">
                            {s.installCommand}
                          </code>
                        )}
                      </div>
                    ))}
                  </Panel>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
