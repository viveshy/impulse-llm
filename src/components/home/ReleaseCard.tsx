import Link from "next/link";
import type { CanonicalModel } from "@/lib/catalog/types";
import { modelHref } from "@/lib/routes";
import { formatAgo, formatTokens } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { LabMark } from "@/components/ui/BrandMark";
import { PricePair } from "@/components/ui/Price";
import { CapLine, KIND_LABEL } from "@/components/models/bits";

export function ReleaseCard({ model, today }: { model: CanonicalModel; today: string }) {
  const ref = model.reference;
  return (
    <Link
      href={modelHref(model)}
      className="group flex min-w-0 flex-col rounded-[12px] border border-border bg-panel p-4 shadow-[var(--shadow)] transition-colors hover:border-border-strong"
    >
      <div className="flex items-center gap-2 text-[13px] text-ink-3">
        <LabMark labId={model.labId} name={model.labName} size={22} />
        <span className="truncate">{model.labName}</span>
        <span className="ml-auto whitespace-nowrap">{model.releaseDate ? formatAgo(model.releaseDate, today) : ""}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <h3 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-ink group-hover:text-accent">
          {model.name}
        </h3>
        {model.kind !== "chat" && <Badge>{KIND_LABEL[model.kind]}</Badge>}
        {model.preview && <Badge tone="warn">Preview</Badge>}
      </div>
      <p className="mt-1 line-clamp-2 min-h-[40px] text-[13.5px] leading-[1.45] text-ink-3">
        {model.description || `${model.labName}'s ${KIND_LABEL[model.kind].toLowerCase()} model.`}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border-2 pt-3 text-[13px]">
        <div className="min-w-0">
          <dt className="text-ink-3">Input / output per 1M</dt>
          <dd className="mt-[2px] text-[14px]">
            <PricePair input={ref.pricing.inputPerMTok} output={ref.pricing.outputPerMTok} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-3">Context</dt>
          <dd className="mt-[2px] text-[14px] text-ink">
            {model.contextWindow ? `${formatTokens(model.contextWindow)} tokens` : "-"}
          </dd>
        </div>
      </dl>
      <CapLine model={model} className="mt-3" />
    </Link>
  );
}
