import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GitCompare } from "lucide-react";
import { getDataSource } from "@/lib/data";
import { computeAlternatives } from "@/lib/alternatives";
import { formatReleaseDate } from "@/lib/utils/format";
import { Topbar } from "@/components/layout/Topbar";
import { StatusPill } from "@/components/common/StatusPill";
import { ModelTabs } from "@/components/models/detail/ModelTabs";

type Params = Promise<{ id: string }>;

const CATEGORY_LABEL: Record<string, string> = {
  frontier: "Frontier",
  open: "Open",
  cloud: "Cloud",
  inference: "Inference",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const model = await getDataSource().getModel(id);
  return { title: model?.name ?? "Model" };
}

export default async function ModelPage({ params }: { params: Params }) {
  const { id } = await params;
  const ds = getDataSource();

  const model = await ds.getModel(id);
  if (!model) notFound();

  const provider = await ds.getProvider(model.providerId);
  if (!provider) notFound();

  // Related: same provider first, padded with the most popular other models.
  const sameProvider = (await ds.getModelsByProvider(model.providerId)).filter((m) => m.id !== id);
  let related = sameProvider.slice(0, 3);
  if (related.length < 3) {
    const others = (await ds.getModels({ sort: "popularity" })).filter(
      (m) => m.id !== id && !related.some((r) => r.id === m.id),
    );
    related = [...related, ...others].slice(0, 3);
  }

  const providers = await ds.getProviders();
  const providerNames = Object.fromEntries(providers.map((p) => [p.id, p.name]));

  const allModels = await ds.getModels({});
  const alternatives = computeAlternatives(model, allModels, 8);
  const monograms = Object.fromEntries(providers.map((p) => [p.id, p.monogram]));

  return (
    <>
      <Topbar
        actions={
          <Link
            href={`/app/compare?ids=${model.id}`}
            className="inline-flex h-[28px] items-center gap-[6px] rounded-[6px] border border-border px-[10px] text-[13px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink"
          >
            <GitCompare size={13} className="text-ink-3" />
            Compare
          </Link>
        }
      >
        <Link href="/app/models" className="text-ink-3 hover:text-ink-2">
          Models
        </Link>
        <span className="text-ink-4">/</span>
        <span className="text-ink">{model.name}</span>
      </Topbar>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 pt-[22px]">
          <h1 className="flex flex-wrap items-center gap-[11px] text-[26px] font-semibold tracking-[-0.03em]">
            {model.name}
            <StatusPill status={model.deprecation} note={CATEGORY_LABEL[provider.category]} />
          </h1>
          <div className="mt-2 text-[15px] text-ink-3">
            <span className="text-ink-2">{provider.name}</span>
            {model.family ? ` · ${model.family} family` : ""} · Released{" "}
            {formatReleaseDate(model.releaseDate)} ·{" "}
            {model.openness.isOpenWeights ? (model.openness.license ?? "Open weights") : "Proprietary"}
          </div>
          <p className="mt-[14px] max-w-[70ch] text-[16px] leading-[1.6] text-ink-2">
            {model.description}
          </p>
        </div>

        <ModelTabs
          model={model}
          provider={provider}
          related={related}
          providerNames={providerNames}
          monograms={monograms}
          alternatives={alternatives}
        />
      </div>
    </>
  );
}
