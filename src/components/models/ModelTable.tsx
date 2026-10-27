import Link from "next/link";
import type { CanonicalModel } from "@/lib/catalog/types";
import { isFirstParty } from "@/lib/catalog/group";
import { isRetired } from "@/lib/catalog/lineage";
import { labHref, modelHref } from "@/lib/routes";
import { formatReleaseDate, formatTokens, formatUsd } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { PricePair } from "@/components/ui/Price";
import { CapLine, KIND_LABEL } from "./bits";

export function ModelTable({
  models,
  today,
  showKind,
  showLab = true,
}: {
  models: CanonicalModel[];
  today: string;
  showKind?: boolean;
  showLab?: boolean;
}) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Model</th>
            {/* Phones get the name and the price; the rest of the columns from sm up. */}
            <th className="num sm:hidden">In / out per 1M</th>
            <th className="hidden sm:table-cell">Released</th>
            <th className="num hidden sm:table-cell">Input / 1M</th>
            <th className="num hidden sm:table-cell">Output / 1M</th>
            <th className="num hidden sm:table-cell">Context</th>
            <th className="num hidden sm:table-cell">Hosts</th>
            <th className="hidden sm:table-cell">Capabilities</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => {
            const ref = m.reference;
            const viaHost = ref.priced && !isFirstParty(ref, m.labId);
            const retired = isRetired(m, today);
            return (
              <tr key={m.slug}>
                <td className="wrap sm:min-w-[220px] sm:whitespace-nowrap">
                  <div className="flex flex-wrap items-center gap-x-2 sm:flex-nowrap">
                    <Link href={modelHref(m)} className="font-medium text-ink hover:text-accent hover:underline">
                      {m.name}
                    </Link>
                    {m.preview && <Badge tone="warn">Preview</Badge>}
                    {retired && <Badge>Retired</Badge>}
                    {m.openWeights && m.tier !== "open" && <Badge>Open weights</Badge>}
                  </div>
                  <div className="text-[13px] text-ink-3">
                    {showLab && (
                      <Link href={labHref(m.labSlug)} className="hover:text-ink">
                        {m.labName}
                      </Link>
                    )}
                    {showLab && showKind && " · "}
                    {showKind && KIND_LABEL[m.kind]}
                  </div>
                </td>
                <td className="num sm:hidden">
                  {ref.priced ? <PricePair input={ref.pricing.inputPerMTok} output={ref.pricing.outputPerMTok} /> : <span className="text-ink-3">-</span>}
                  {viaHost && <div className="text-[12px] text-ink-3">via {ref.host.name}</div>}
                </td>
                <td className="hidden text-ink-2 sm:table-cell">{m.releaseDate ? formatReleaseDate(m.releaseDate) : "-"}</td>
                <td className="num hidden sm:table-cell">
                  {ref.priced ? formatUsd(ref.pricing.inputPerMTok) : <span className="text-ink-3">-</span>}
                  {viaHost && <div className="text-[12px] text-ink-3">via {ref.host.name}</div>}
                </td>
                <td className="num hidden sm:table-cell">
                  {ref.priced ? formatUsd(ref.pricing.outputPerMTok) : <span className="text-ink-3">-</span>}
                </td>
                <td className="num hidden text-ink-2 sm:table-cell">{m.contextWindow ? formatTokens(m.contextWindow) : "-"}</td>
                <td className="num hidden text-ink-2 sm:table-cell">{m.hostCount}</td>
                <td className="hidden sm:table-cell">
                  <CapLine model={m} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
