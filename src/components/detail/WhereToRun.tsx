import { qualifiers, type HostRow } from "@/lib/catalog/detail";
import { isPriceOption } from "@/lib/catalog/group";
import { HOST_KIND_LABEL } from "@/lib/catalog/hosts";
import type { Listing } from "@/lib/catalog/types";
import { hostHref } from "@/lib/routes";
import { formatDate, formatTokens, formatUsd } from "@/lib/utils/format";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { HostMark } from "@/components/ui/BrandMark";
import { CopyId } from "@/components/ui/CopyButton";
import { Delta, PricePair } from "@/components/ui/Price";

const where = (l: Listing) => qualifiers(l).join(" · ");

function Status({ l, today }: { l: Listing; today: string }) {
  const day = l.deprecationDate && l.deprecationDate >= today ? l.deprecationDate : undefined;
  if (day && l.notBefore) {
    return (
      <Badge title="The host promises it until at least this day. No shutdown is scheduled yet.">
        No retirement before {formatDate(day)}
      </Badge>
    );
  }
  if (day) return <Badge tone="warn">Retires {formatDate(day)}</Badge>;
  return l.status === "preview" ? <Badge tone="warn">Preview</Badge> : null;
}

function Row({ l, delta, today, sub }: { l: Listing; delta: number | null; today: string; sub?: boolean }) {
  const plan = l.host.kind === "subscription";
  return (
    <tr className={sub ? "text-[13.5px]" : undefined}>
      <td className="wrap sm:whitespace-nowrap">
        {sub ? (
          <>
            <span className="pl-4 text-ink-3">{where(l) || "Alias"}</span>
            <div className="break-all font-mono text-[12px] text-ink-4 sm:hidden">{l.apiModelId}</div>
          </>
        ) : (
          // The logo gets its own column, so every line of text lines up beside it.
          <div className="flex items-start gap-2">
            <HostMark slug={l.host.slug} name={l.host.name} size={20} className="mt-px" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 sm:flex-nowrap">
                <Link href={hostHref(l.host.slug)} className="font-medium text-ink hover:text-accent hover:underline">
                  {l.host.name}
                </Link>
                <span className="text-[12.5px] text-ink-3">{HOST_KIND_LABEL[l.host.kind]}</span>
              </div>
              {where(l) && <div className="text-[12.5px] text-ink-3">{where(l)}</div>}
              <div className="break-all font-mono text-[12px] text-ink-4 sm:hidden">{l.apiModelId}</div>
            </div>
          </div>
        )}
      </td>
      {/* Phones: the host on the left, everything about the price on the right. */}
      <td className="num sm:hidden">
        {plan ? (
          <span className="text-[13px] text-ink-3">In the subscription</span>
        ) : l.priced ? (
          <PricePair input={l.pricing.inputPerMTok} output={l.pricing.outputPerMTok} />
        ) : (
          <span className="text-ink-3">-</span>
        )}
        {!plan && delta !== null && Math.round(delta * 100) !== 0 && (
          <div className="text-[12px] text-ink-3">
            <Delta ratio={delta} /> vs headline
          </div>
        )}
        <div className="mt-1 empty:hidden">
          <Status l={l} today={today} />
        </div>
      </td>
      <td className="hidden sm:table-cell">
        <CopyId id={l.apiModelId} />
      </td>
      {plan ? (
        <td colSpan={3} className="num hidden text-[13px] text-ink-3 sm:table-cell">
          Included in the subscription
        </td>
      ) : (
        <>
          <td className="num hidden sm:table-cell">
            {l.priced ? formatUsd(l.pricing.inputPerMTok) : <span className="text-ink-3">-</span>}
          </td>
          <td className="num hidden sm:table-cell">
            {l.priced ? formatUsd(l.pricing.outputPerMTok) : <span className="text-ink-3">-</span>}
          </td>
          <td className="num hidden sm:table-cell">
            {delta === null ? <span className="text-ink-4">-</span> : <Delta ratio={delta} />}
          </td>
        </>
      )}
      <td className="num hidden text-ink-2 sm:table-cell">{l.contextWindow ? formatTokens(l.contextWindow) : "-"}</td>
      <td className="hidden sm:table-cell">
        <Status l={l} today={today} />
      </td>
    </tr>
  );
}

export function WhereToRun({ rows, today, headline }: { rows: HostRow[]; today: string; headline: number | null }) {
  const extra = rows.reduce((n, r) => n + r.others.length, 0);
  const delta = (l: Listing) => (headline && isPriceOption(l) && l.blended ? l.blended / headline - 1 : null);
  return (
    <div className="space-y-3">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Host</th>
              <th className="num sm:hidden">In / out per 1M</th>
              <th className="hidden sm:table-cell">Model id</th>
              <th className="num hidden sm:table-cell">Input / 1M</th>
              <th className="num hidden sm:table-cell">Output / 1M</th>
              <th
                className="num hidden sm:table-cell"
                title="Blended price (3 input : 1 output) against the headline price"
              >
                vs headline
              </th>
              <th className="num hidden sm:table-cell">Context</th>
              <th className="hidden sm:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.listing.id} l={r.listing} delta={r.delta} today={today} />
            ))}
          </tbody>
        </table>
      </div>
      {extra > 0 && (
        <details className="group rounded-[12px] border border-border bg-panel">
          <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-medium text-ink-2 hover:text-ink">
            <span className="group-open:hidden">Show {extra} more listings: regions, snapshots and variants</span>
            <span className="hidden group-open:inline">Hide regional listings</span>
          </summary>
          <div className="overflow-x-auto border-t border-border">
            <table className="tbl">
              <tbody>
                {rows
                  .filter((r) => r.others.length)
                  .flatMap((r) => [
                    <tr key={`${r.listing.id}-h`}>
                      <td colSpan={8} className="bg-sunken text-[13px] font-medium text-ink-2">
                        {r.listing.host.name}
                      </td>
                    </tr>,
                    ...r.others.map((l) => <Row key={l.id} l={l} delta={delta(l)} today={today} sub />),
                  ])}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
