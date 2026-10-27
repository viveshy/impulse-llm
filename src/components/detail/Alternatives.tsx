import Link from "next/link";
import type { Alternative, AlternativeBuckets } from "@/lib/catalog/alternatives";
import { CAPABILITY_SHORT } from "@/lib/domain/capabilities";
import { modelHref } from "@/lib/routes";
import { clsx } from "@/lib/utils/clsx";
import { Badge } from "@/components/ui/Badge";
import { PricePair } from "@/components/ui/Price";

function Item({ alt, sameModel }: { alt: Alternative; sameModel?: boolean }) {
  const l = alt.listing;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        {sameModel ? (
          <span className="font-medium text-ink">{l.host.name}</span>
        ) : (
          <Link href={modelHref(alt.model)} className="font-medium text-ink hover:text-accent hover:underline">
            {alt.model.name}
          </Link>
        )}
        <div className="text-[13px] text-ink-3">
          {sameModel ? [l.region, l.deployment, l.variant].filter(Boolean).join(" · ") || l.apiModelId : `${alt.model.labName} · on ${l.host.name}`}
        </div>
        <div className="mt-[2px] text-[13px]">
          <PricePair input={l.pricing.inputPerMTok} output={l.pricing.outputPerMTok} />
        </div>
        {!sameModel && (
          <div className="mt-[2px] text-[12.5px] text-ink-3">
            {alt.missing.length
              ? `Lacks ${alt.missing.map((k) => CAPABILITY_SHORT[k].toLowerCase()).join(", ")}`
              : "Has every key capability"}
          </div>
        )}
      </div>
      {alt.saving !== null && (
        <Badge tone="ok" title="Saving on blended price (3 input : 1 output)">
          {Math.round(alt.saving * 100)}% less
        </Badge>
      )}
    </li>
  );
}

function Bucket({
  title,
  items,
  empty,
  sameModel,
}: {
  title: string;
  items: Alternative[];
  empty: string;
  sameModel?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex min-w-0 flex-col rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]",
        !items.length && "md:self-start",
      )}
    >
      <h3 className="border-b border-border-2 px-4 py-3 text-[14.5px] font-semibold tracking-[-0.01em]">{title}</h3>
      {items.length ? (
        <ul className="divide-y divide-border-2">
          {items.map((a) => (
            <Item key={a.listing.id} alt={a} sameModel={sameModel} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-[13.5px] text-ink-3">{empty}</p>
      )}
    </div>
  );
}

export function Alternatives({
  buckets,
  labName,
  priceHost,
}: {
  buckets: AlternativeBuckets;
  labName: string;
  /** Where the model's own price comes from, usually the lab's API. */
  priceHost: string;
}) {
  const what = buckets.priced ? "cheaper" : "similar";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {buckets.priced && (
        <Bucket
          title="Same model, cheaper host"
          items={buckets.cheaperHosts}
          empty={`No host sells it for less than ${priceHost}.`}
          sameModel
        />
      )}
      <Bucket
        title={`Smaller ${labName} models`}
        items={buckets.sameLab}
        empty={`No ${what} ${labName} model keeps its key capabilities.`}
      />
      <Bucket title="Other frontier labs" items={buckets.frontier} empty={`No ${what} match from another frontier lab.`} />
      <Bucket title="Open-weight picks" items={buckets.openWeight} empty={`No ${what} open-weight match.`} />
    </div>
  );
}
