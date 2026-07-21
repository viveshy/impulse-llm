"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Model, Provider } from "@/lib/domain/types";
import {
  formatLatency,
  formatPct,
  formatPrice,
  formatReleaseDate,
  formatThroughput,
  formatTokens,
} from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";
import { MetricsStrip, type Metric } from "@/components/common/MetricsStrip";
import { Panel, KeyValue, SectionLabel } from "@/components/common/Panel";
import { EndpointList } from "@/components/providers/EndpointList";
import type { Alternative } from "@/lib/alternatives";
import { CapabilityChecklist } from "./CapabilityChecklist";
import { BenchmarkBars } from "./BenchmarkBars";
import { RelatedModels } from "./RelatedModels";
import { AlternativeCard } from "./AlternativeCard";

const TABS = ["Overview", "Capabilities", "Pricing", "Benchmarks", "API", "Alternatives"] as const;
type Tab = (typeof TABS)[number];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ModelTabs({
  model,
  provider,
  related,
  providerNames,
  monograms,
  alternatives,
}: {
  model: Model;
  provider: Provider;
  related: Model[];
  providerNames: Record<string, string>;
  monograms: Record<string, string>;
  alternatives: Alternative[];
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const nameMap = useMemo(() => new Map(Object.entries(providerNames)), [providerNames]);
  const monoMap = useMemo(() => new Map(Object.entries(monograms)), [monograms]);

  const metrics: Metric[] = [
    { label: "Context", value: formatTokens(model.context.contextWindow) },
    { label: "Max output", value: formatTokens(model.context.maxOutputTokens) },
    {
      label: "Input",
      value: <PriceValue value={model.pricing.inputPerMTok} />,
    },
    {
      label: "Output",
      value: <PriceValue value={model.pricing.outputPerMTok} />,
    },
    {
      label: "Cached in",
      value:
        model.pricing.cachedInputPerMTok !== undefined ? (
          <PriceValue value={model.pricing.cachedInputPerMTok} />
        ) : (
          "-"
        ),
    },
    { label: "Latency", value: formatLatency(model.performance.ttftMs) },
  ];

  const details = (
    <Panel>
      <KeyValue label="Provider">
        <Link href={`/app/providers/${provider.id}`} className="text-accent hover:underline">
          {provider.name}
        </Link>
      </KeyValue>
      {model.family && <KeyValue label="Family">{model.family}</KeyValue>}
      <KeyValue label="Released">{formatReleaseDate(model.releaseDate)}</KeyValue>
      <KeyValue label="License">
        {model.openness.isOpenWeights ? (model.openness.license ?? "Open weights") : "Proprietary"}
      </KeyValue>
      <KeyValue label="Input">{model.modalities.input.map(cap).join(", ")}</KeyValue>
      <KeyValue label="Output">{model.modalities.output.map(cap).join(", ")}</KeyValue>
      {model.rateLimits?.rpm && (
        <KeyValue label="Rate limit">
          {model.rateLimits.rpm.toLocaleString()} RPM
          {model.rateLimits.tpm ? ` · ${formatTokens(model.rateLimits.tpm)} TPM` : ""}
        </KeyValue>
      )}
      <KeyValue label="Throughput">{formatThroughput(model.performance.tokensPerSec)}</KeyValue>
      <KeyValue label="Availability">{formatPct(model.performance.availabilityPct)}</KeyValue>
    </Panel>
  );

  return (
    <>
      <div className="flex gap-[2px] border-b border-border px-6 pt-[18px]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              "flex items-center gap-[6px] border-b-2 px-[12px] py-[9px] text-[15px] transition-colors",
              t === tab
                ? "border-accent text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2",
            )}
          >
            {t}
            {t === "Alternatives" && alternatives.length > 0 && (
              <span className="rounded-full border border-border px-[5px] text-[12px] text-ink-4">
                {alternatives.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 pb-12 pt-[22px]">
        {tab === "Overview" && (
          <div className="flex flex-col gap-[26px]">
            <MetricsStrip items={metrics} />
            <div className="grid grid-cols-1 gap-[26px] lg:grid-cols-[minmax(0,1fr)_296px]">
              <div className="flex min-w-0 flex-col gap-[30px]">
                <section>
                  <SectionLabel>Capabilities</SectionLabel>
                  <CapabilityChecklist capabilities={model.capabilities} />
                </section>
                {model.benchmarks && model.benchmarks.length > 0 && (
                  <section>
                    <SectionLabel>Benchmarks</SectionLabel>
                    <BenchmarkBars benchmarks={model.benchmarks} />
                  </section>
                )}
              </div>
              <div>
                <SectionLabel>Details</SectionLabel>
                {details}
              </div>
            </div>
            {related.length > 0 && (
              <section>
                <SectionLabel>Related models</SectionLabel>
                <RelatedModels models={related} providerName={nameMap} />
              </section>
            )}
          </div>
        )}

        {tab === "Capabilities" && <CapabilityChecklist capabilities={model.capabilities} />}

        {tab === "Pricing" && (
          <div className="max-w-md">
            <Panel>
              <KeyValue label="Input / 1M tokens">{formatPrice(model.pricing.inputPerMTok)}</KeyValue>
              <KeyValue label="Output / 1M tokens">{formatPrice(model.pricing.outputPerMTok)}</KeyValue>
              {model.pricing.cachedInputPerMTok !== undefined && (
                <KeyValue label="Cached input / 1M">
                  {formatPrice(model.pricing.cachedInputPerMTok)}
                </KeyValue>
              )}
              {model.pricing.batchDiscount !== undefined && (
                <KeyValue label="Batch discount">
                  {Math.round(model.pricing.batchDiscount * 100)}%
                </KeyValue>
              )}
            </Panel>
            <p className="mt-3 text-[15px] text-ink-4">
              Prices in USD per 1M tokens. A full cost calculator is coming in a later phase.
            </p>
          </div>
        )}

        {tab === "Benchmarks" && <BenchmarkBars benchmarks={model.benchmarks ?? []} />}

        {tab === "API" && (
          <div className="flex flex-col gap-4">
            <EndpointList endpoints={provider.endpoints} />
            <p className="text-[15px] text-ink-4">
              Endpoints exposed by {provider.name}. A full API explorer with request/response
              examples and SDK snippets is coming in a later phase.
            </p>
          </div>
        )}

        {tab === "Alternatives" && (
          <div className="flex flex-col gap-[26px]">
            <p className="max-w-[70ch] text-[15px] leading-[1.6] text-ink-2">
              Ranked stand-ins for {model.name}, scored by capability, context, cost and benchmark
              similarity. Each explains what you gain, what you give up, and how hard the switch is.
            </p>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {alternatives.map((alt) => (
                <AlternativeCard
                  key={alt.model.id}
                  alt={alt}
                  baseId={model.id}
                  providerName={nameMap.get(alt.model.providerId) ?? alt.model.providerId}
                  monogram={monoMap.get(alt.model.providerId) ?? "?"}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PriceValue({ value }: { value: number | null }) {
  if (value === null) return <>-</>;
  return (
    <>
      <span className="text-[15px] text-ink-3">$</span>
      {value.toFixed(2)}
    </>
  );
}
